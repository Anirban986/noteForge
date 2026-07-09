"""
services/question_parser.py
----------------------------
Uses Gemini 2.5 Flash instead of Groq for question extraction.

Changes (v4):
  - Switched from Groq llama-3.1-8b-instant to Gemini 2.5 Flash.
  - Uses response_mime_type="application/json" — Gemini returns clean
    JSON with no markdown fences, no preamble, no commentary.
  - Removed langchain_groq / HumanMessage imports entirely.
  - _call_llm() updated for Gemini SDK and Gemini rate limit format.
  - All other logic unchanged from v3 (3-stage fallback, _clean_name,
    TRUNCATED signal, syllabus-grounded mapping).
"""

import json
import logging
import re
import time
import psycopg2
import google.generativeai as genai
import config

from services.vector_store         import query_by_source
from services.syllabus_parser      import get_syllabus_tree
from prompt.question_parser_prompt import build_parser_prompt

logger = logging.getLogger(__name__)

genai.configure(api_key=config.GEMINI_API_KEY)

_json_llm = genai.GenerativeModel(
    model_name=config.GEMINI_MODEL,
    generation_config=genai.GenerationConfig(
        temperature=0.1,
        response_mime_type="application/json",  # forces valid JSON output
    )
)


# ─────────────────────────────────────────────────────────
#  Name cleaner
#  Strips section prefixes the LLM echoes back even when
#  the prompt explicitly tells it not to.
#
#  "Section 1 - DBMS"          → "DBMS"
#  "Section 2: Algorithms"     → "Algorithms"
#  "Sec. 3 — Networks"         → "Computer Networks"
#  "Section1 Operating System" → "Operating System"
# ─────────────────────────────────────────────────────────

_SECTION_PREFIX = re.compile(
    r"""
    ^
    (?:sec(?:tion)?\.?\s*)
    \d+
    (?:\s*[-:—–]\s*|\s+)
    """,
    re.IGNORECASE | re.VERBOSE,
)

def _clean_name(name: str) -> str:
    if not name:
        return name
    return _SECTION_PREFIX.sub("", name).strip()


# ─────────────────────────────────────────────────────────
#  JSON extraction
#  Gemini with response_mime_type="application/json" almost
#  always returns clean JSON. This is a safety net for edge
#  cases. On truncation raises TRUNCATED: signal so the
#  caller escalates to the next stage.
# ─────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    # Strip any accidental markdown fences
    text = re.sub(r"^```json\s*", "", text.strip(), flags=re.IGNORECASE)
    text = re.sub(r"```\s*$", "", text)
    text = text.strip()

    # Direct parse — should always succeed with Gemini JSON mode
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find first { and match braces
    start = text.find("{")
    if start == -1:
        raise ValueError(
            f"No JSON object found in LLM response. "
            f"First 200 chars: {text[:200]}"
        )

    depth  = 0
    end    = start
    in_str = False
    escape = False

    for i, ch in enumerate(text[start:], start=start):
        if escape:
            escape = False
            continue
        if ch == "\\" and in_str:
            escape = True
            continue
        if ch == '"' and not escape:
            in_str = not in_str
        if not in_str:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break

    if depth == 0:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Balanced JSON found but failed to parse: {exc}. "
                f"First 200 chars: {text[:200]}"
            )

    # Truncated — signal for retry with smaller prompt
    logger.warning(
        f"[Parser] Response truncated at char {len(text)} "
        f"(unclosed depth={depth}). Signalling for retry."
    )
    raise ValueError(
        f"TRUNCATED: LLM response was cut off mid-JSON "
        f"(unclosed brace depth={depth}). "
        f"Retry with compact syllabus or smaller OCR chunk."
    )


# ─────────────────────────────────────────────────────────
#  Single Gemini call with retry
#  Rate limit hits do NOT consume MAX_RETRIES.
# ─────────────────────────────────────────────────────────

def _call_llm(prompt: str) -> dict:
    attempt = 0
    while attempt < config.MAX_RETRIES:
        attempt += 1
        try:
            response = _json_llm.generate_content(prompt)
            raw      = response.text

            logger.info(f"[Parser] Gemini response: {len(raw)} chars")

            parsed = _extract_json(raw)

            if "questions" not in parsed:
                raise ValueError("Response missing 'questions' key")

            return parsed

        except ValueError as e:
            # Propagate TRUNCATED immediately — retrying won't help
            if "TRUNCATED" in str(e):
                raise
            logger.warning(f"[Parser] Attempt {attempt}: {e}")
            if attempt >= config.MAX_RETRIES:
                raise
            time.sleep(2)

        except Exception as e:
            err_str = str(e)

            # Gemini rate limit (429) or quota exhausted
            if "429" in err_str or "quota" in err_str.lower() or "rate" in err_str.lower():
                wait = 60
                match = re.search(r"retry after (\d+)", err_str, re.IGNORECASE)
                if match:
                    wait = int(match.group(1)) + 2
                logger.warning(
                    f"[Parser] Gemini rate limit — waiting {wait}s "
                    f"(attempt {attempt}/{config.MAX_RETRIES} preserved)"
                )
                time.sleep(wait)
                attempt -= 1   # rate limit does not count as a failed attempt
                continue

            logger.error(f"[Parser] Attempt {attempt}: {e}")
            if attempt >= config.MAX_RETRIES:
                raise
            time.sleep(3)

    raise ValueError("All LLM attempts failed")


# ─────────────────────────────────────────────────────────
#  Batched LLM call — 3-stage fallback
#
#  Gemini 2.5 Flash has 1M token context so truncation is
#  unlikely, but the fallback stages are kept for safety.
#
#  Stage 1: full OCR, full syllabus (topics included)
#  Stage 2: full OCR, compact syllabus (topics stripped)
#  Stage 3: OCR split in half, compact syllabus, merge
# ─────────────────────────────────────────────────────────

def _call_llm_batched(
    ocr_text:     str,
    exam_hint:    str,
    syllabus_tree,
) -> dict:

    def _attempt(chunk, hint, compact):
        prompt = build_parser_prompt(
            ocr_text=chunk,
            exam_hint=hint,
            syllabus_tree=syllabus_tree,
            compact=compact,
        )
        return _call_llm(prompt)

    # ── Stage 1: full paper, full syllabus ───────────────
    logger.info("[Parser] Stage 1: full paper, full syllabus")
    try:
        result = _attempt(ocr_text, exam_hint, compact=False)
        logger.info(
            f"[Parser] Stage 1 succeeded — "
            f"{len(result.get('questions', []))} questions"
        )
        return result
    except ValueError as e:
        if "TRUNCATED" in str(e):
            logger.warning("[Parser] Stage 1 truncated → Stage 2")
        else:
            logger.warning(f"[Parser] Stage 1 failed ({e}) → Stage 2")

    # ── Stage 2: full paper, compact syllabus ────────────
    logger.info("[Parser] Stage 2: full paper, compact syllabus (topics stripped)")
    try:
        time.sleep(3)
        result = _attempt(ocr_text, exam_hint, compact=True)
        logger.info(
            f"[Parser] Stage 2 succeeded — "
            f"{len(result.get('questions', []))} questions"
        )
        return result
    except ValueError as e:
        if "TRUNCATED" in str(e):
            logger.warning("[Parser] Stage 2 truncated → Stage 3 (split)")
        else:
            logger.warning(f"[Parser] Stage 2 failed ({e}) → Stage 3 (split)")

    # ── Stage 3: split in half, compact syllabus ─────────
    logger.info("[Parser] Stage 3: split paper in half, compact syllabus")

    mid         = len(ocr_text) // 2
    split_point = ocr_text.rfind("\n", mid - 500, mid + 500)
    if split_point == -1:
        split_point = mid

    chunks  = [ocr_text[:split_point], ocr_text[split_point:]]
    results = []

    for i, chunk in enumerate(chunks, 1):
        logger.info(f"[Parser] Stage 3 — batch {i}/2 ({len(chunk)} chars)")
        if i == 2:
            logger.info("[Parser] Pausing 5s between Stage 3 batches...")
            time.sleep(5)   # shorter wait — Gemini has much higher TPM

        batch_result = _attempt(
            chunk,
            f"{exam_hint} (part {i} of 2 — some questions may be missing)",
            compact=True,
        )
        results.append(batch_result)
        logger.info(
            f"[Parser] Stage 3 batch {i} → "
            f"{len(batch_result.get('questions', []))} questions"
        )

    merged = results[0].copy()
    merged["questions"]   = (
        results[0].get("questions", []) +
        results[1].get("questions", [])
    )
    merged["total_marks"] = max(
        results[0].get("total_marks", 0),
        results[1].get("total_marks", 0),
    )
    merged["sections"] = (
        results[0].get("sections", []) +
        results[1].get("sections", [])
    )

    logger.info(
        f"[Parser] Stage 3 merge complete — "
        f"{len(merged['questions'])} total questions"
    )
    return merged


# ─────────────────────────────────────────────────────────
#  DB helpers
# ─────────────────────────────────────────────────────────

def _get_paper_text(source: str) -> str:
    chunks = query_by_source(source, source_type="question_paper", top_k=30)
    if not chunks:
        raise ValueError(f"No chunks in vector store for source={source}")
    return "\n\n".join(c.get("text", "") for c in chunks)


def _verify_chapter_id(cur, chapter_id: str, exam_id: str) -> bool:
    if not chapter_id:
        return False
    cur.execute(
        """
        SELECT 1 FROM chapters c
        JOIN subjects s ON c.subject_id = s.id
        WHERE c.id = %s AND s.exam_id = %s
        LIMIT 1
        """,
        (chapter_id, exam_id),
    )
    return cur.fetchone() is not None


def _upsert_subject_fallback(cur, exam_id: str, name: str) -> str:
    cur.execute(
        """
        INSERT INTO subjects (exam_id, name, is_syllabus_defined)
        VALUES (%s, %s, FALSE)
        ON CONFLICT (exam_id, name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """,
        (exam_id, name.strip()),
    )
    return cur.fetchone()[0]


def _upsert_chapter_fallback(cur, subject_id: str, name: str) -> str:
    cur.execute(
        """
        INSERT INTO chapters (subject_id, name, canonical_name, is_syllabus_defined)
        VALUES (%s, %s, %s, FALSE)
        ON CONFLICT (subject_id, name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
        """,
        (subject_id, name.strip(), name.strip()),
    )
    return cur.fetchone()[0]


def _insert_question(cur, paper_id: str, chapter_id, q: dict):
    cur.execute(
        """
        INSERT INTO questions
          (paper_id, chapter_id, question_text, marks, question_number,
           topic_tags, confidence, question_type, has_diagram)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        """,
        (
            paper_id,
            chapter_id,
            f"Q{q.get('question_number', '')}",
            q.get("marks", 4),
            q.get("question_number"),
            q.get("topic_tags", []),
            q.get("confidence", 0.9),
            q.get("question_type", "MCQ"),
            q.get("has_diagram", False),
        ),
    )


def _aggregate_weightage(cur, exam_id: str, year: int, total_marks: int):
    cur.execute(
        """
        INSERT INTO weightage_stats
          (chapter_id, exam_id, year, question_count, total_marks, weightage_pct)
        SELECT
            q.chapter_id,
            qp.exam_id,
            qp.year,
            COUNT(*)::int,
            SUM(q.marks)::int,
            ROUND((SUM(q.marks)::numeric / NULLIF(%s, 0)) * 100, 2)
        FROM questions      q
        JOIN question_papers qp ON q.paper_id = qp.id
        WHERE qp.exam_id     = %s
          AND qp.year        = %s
          AND q.chapter_id   IS NOT NULL
        GROUP BY q.chapter_id, qp.exam_id, qp.year
        ON CONFLICT (chapter_id, exam_id, year) DO UPDATE
          SET question_count = EXCLUDED.question_count,
              total_marks    = EXCLUDED.total_marks,
              weightage_pct  = EXCLUDED.weightage_pct
        """,
        (total_marks, exam_id, year),
    )


# ─────────────────────────────────────────────────────────
#  Main entry point
# ─────────────────────────────────────────────────────────

def parse_and_store(source: str, exam_id: str, year: int) -> dict:
    logger.info(f"[Parser] Starting — source={source} exam={exam_id} year={year}")

    # 1. Fetch paper text from vector store
    text = _get_paper_text(source)
    logger.info(f"[Parser] Retrieved {len(text)} chars from vector store")

    # 2. Load syllabus tree from Postgres
    syllabus_tree = get_syllabus_tree(exam_id)
    has_syllabus  = len(syllabus_tree) > 0

    if has_syllabus:
        chapter_count = sum(len(s["chapters"]) for s in syllabus_tree)
        logger.info(
            f"[Parser] Syllabus found — {len(syllabus_tree)} subjects, "
            f"{chapter_count} chapters. Using syllabus-grounded mapping."
        )
    else:
        logger.warning(
            "[Parser] No syllabus found. "
            "Falling back to Gemini inference — chapter names may be inconsistent."
        )

    # 3. Call Gemini with 3-stage fallback
    logger.info("[Parser] Calling Gemini 2.5 Flash (3-stage fallback enabled)...")
    parsed = _call_llm_batched(
        ocr_text=text,
        exam_hint=f"exam_id={exam_id} year={year}",
        syllabus_tree=syllabus_tree if has_syllabus else None,
    )

    questions   = parsed.get("questions", [])
    total_marks = parsed.get("total_marks", 85)

    if not questions:
        logger.warning("[Parser] No questions extracted")
        return {
            "questions_parsed":  0,
            "chapters_mapped":   0,
            "syllabus_grounded": has_syllabus,
            "fallback_created":  0,
        }

    logger.info(f"[Parser] Extracted {len(questions)} questions")

    # 4. Persist to Postgres
    conn             = psycopg2.connect(config.DATABASE_URL)
    cur              = conn.cursor()
    chapters_used    = set()
    fallback_created = 0

    try:
        cur.execute(
            "SELECT id FROM question_papers WHERE exam_id = %s AND year = %s",
            (exam_id, year),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError(
                f"question_papers row not found for exam={exam_id} year={year}"
            )
        paper_id = row[0]

        for q in questions:
            chapter_id = None

            if has_syllabus:
                raw_chapter_id = q.get("chapter_id")

                # Primary: UUID match
                if raw_chapter_id and _verify_chapter_id(cur, raw_chapter_id, exam_id):
                    chapter_id = raw_chapter_id
                    chapters_used.add(chapter_id)
                else:
                    # Fallback: name-based match with prefix cleaning
                    subject_name = _clean_name(q.get("subject_name") or "")
                    chapter_name = _clean_name(q.get("chapter_name") or "")

                    if chapter_name and subject_name:
                        cur.execute(
                            """
                            SELECT c.id FROM chapters c
                            JOIN subjects s ON c.subject_id = s.id
                            WHERE s.exam_id             = %s
                              AND s.is_syllabus_defined = TRUE
                              AND LOWER(c.name)         = LOWER(%s)
                              AND LOWER(s.name)         = LOWER(%s)
                            LIMIT 1
                            """,
                            (exam_id, chapter_name, subject_name),
                        )
                        match = cur.fetchone()
                        if match:
                            chapter_id = match[0]
                            chapters_used.add(chapter_id)
                        else:
                            logger.warning(
                                f"[Parser] Q{q.get('question_number')}: "
                                f"'{chapter_name}' / '{subject_name}' "
                                f"not in syllabus — unclassified"
                            )
            else:
                subject_name = _clean_name(q.get("subject_name") or "Unknown")
                chapter_name = _clean_name(q.get("chapter_name") or "Unclassified")

                if subject_name and chapter_name and chapter_name != "Unclassified":
                    subject_id = _upsert_subject_fallback(cur, exam_id, subject_name)
                    chapter_id = _upsert_chapter_fallback(cur, subject_id, chapter_name)
                    chapters_used.add(chapter_id)
                    fallback_created += 1

            _insert_question(cur, paper_id, chapter_id, q)

        _aggregate_weightage(cur, exam_id, year, total_marks)
        conn.commit()

        if not has_syllabus and fallback_created > 0:
            logger.warning(
                f"[Parser] Created {fallback_created} inference chapters. "
                f"Upload the official syllabus for consistent naming."
            )

        logger.info(
            f"[Parser] Done — {len(questions)} questions, "
            f"{len(chapters_used)} chapters mapped, "
            f"syllabus_grounded={has_syllabus}"
        )

    except Exception as e:
        conn.rollback()
        logger.exception(f"[Parser] Postgres write failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

    return {
        "questions_parsed":  len(questions),
        "chapters_mapped":   len(chapters_used),
        "syllabus_grounded": has_syllabus,
        "fallback_created":  fallback_created,
    }