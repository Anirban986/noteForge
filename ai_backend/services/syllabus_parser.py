"""
services/syllabus_parser.py
---------------------------

Parses an official exam syllabus PDF into a structured
subject → chapter → topic tree and stores it in Postgres.

Changes (v2):
  - Switched from Groq llama-3.1-8b-instant to Gemini 2.5 Flash.
  - Uses response_mime_type="application/json" to force valid JSON
    output — no markdown fences, no preamble, no commentary.
  - Removed langchain_groq dependency entirely.
  - _call_gemini_syllabus() now uses google.generativeai SDK directly.
  - Rate limit handling updated for Gemini 429 error format.
"""

import json
import logging
import re
import psycopg2
import google.generativeai as genai
import config

logger = logging.getLogger(__name__)

genai.configure(api_key=config.GEMINI_API_KEY)

_json_llm = genai.GenerativeModel(
    model_name=config.GEMINI_MODEL,
    generation_config=genai.GenerationConfig(
        temperature=0.1,
        response_mime_type="application/json",  # forces valid JSON — no fences needed
    )
)


# ─────────────────────────────────────────────────────────
#  Gemini prompt — syllabus parser
# ─────────────────────────────────────────────────────────

_SYLLABUS_PROMPT = """
You are an expert exam syllabus analyst.

Given the raw text of an official exam syllabus, extract the complete
subject → chapter → topics structure.

Return ONLY valid JSON, no markdown fences, no commentary:

{{
  "exam_name":  "<string>",
  "subjects": [
    {{
      "name":     "<canonical subject name>",
      "section":  "<e.g. Section 1 or null>",
      "chapters": [
        {{
          "name":   "<canonical chapter name>",
          "topics": ["<topic1>", "<topic2>", ...]
        }}
      ]
    }}
  ]
}}

RULES:
1. Use the EXACT section headings from the syllabus as subject names.
   e.g. "Engineering Mathematics", "Digital Logic", "Operating System"
   Do NOT rename, abbreviate, or combine subjects.

2. Within each subject, identify distinct chapters/sub-areas.
   For GATE CS Engineering Mathematics, chapters are:
     Discrete Mathematics, Linear Algebra, Calculus, Probability and Statistics
   For GATE CS Algorithms, chapters are:
     Searching and Sorting, Hashing, Algorithm Design Techniques,
     Graph Algorithms, Complexity Analysis

3. Topics are the specific concepts listed under each chapter.
   Keep them short (2-5 words each). These become topic_tags for question mapping.

4. If the syllabus does not explicitly break a subject into chapters
   (e.g. Digital Logic is one block), create logical chapters based on
   the topics listed. Never create a chapter called "General" or "Miscellaneous".

5. Preserve the order from the syllabus — section numbers matter for display.

Syllabus text:
{text}
"""


# ─────────────────────────────────────────────────────────
#  Gemini call with retry
# ─────────────────────────────────────────────────────────

def _call_gemini_syllabus(text: str) -> dict:
    prompt = _SYLLABUS_PROMPT.format(text=text[:20000])

    attempt = 0
    while attempt < config.MAX_RETRIES:
        attempt += 1
        try:
            response = _json_llm.generate_content(prompt)
            raw      = response.text.strip()

            logger.info(f"[SyllabusParser] Gemini response: {len(raw)} chars")

            # response_mime_type="application/json" means Gemini returns
            # clean JSON — but strip fences as a safety net anyway
            raw = re.sub(r"^```json\s*", "", raw, flags=re.IGNORECASE)
            raw = re.sub(r"```\s*$",     "", raw)
            raw = raw.strip()

            parsed = json.loads(raw)

            if "subjects" not in parsed:
                raise ValueError("Gemini response missing 'subjects' key")

            return parsed

        except json.JSONDecodeError as e:
            logger.error(f"[SyllabusParser] Attempt {attempt}: invalid JSON: {e}")
            if attempt >= config.MAX_RETRIES:
                raise ValueError(
                    f"Gemini returned invalid JSON after {config.MAX_RETRIES} attempts"
                )
            time.sleep(2)

        except Exception as e:
            err_str = str(e)

            # Gemini rate limit
            if "429" in err_str or "quota" in err_str.lower() or "rate" in err_str.lower():
                wait = 60
                match = re.search(r"retry after (\d+)", err_str, re.IGNORECASE)
                if match:
                    wait = int(match.group(1)) + 2
                logger.warning(
                    f"[SyllabusParser] Gemini rate limit — waiting {wait}s "
                    f"(attempt {attempt} preserved)"
                )
                import time as _time
                _time.sleep(wait)
                attempt -= 1
                continue

            logger.error(f"[SyllabusParser] Attempt {attempt}: {e}")
            if attempt >= config.MAX_RETRIES:
                raise
            import time as _time
            _time.sleep(3)

    return {}


# ─────────────────────────────────────────────────────────
#  Postgres upsert helpers
# ─────────────────────────────────────────────────────────

def _upsert_subject(cur, exam_id: str, name: str, section: str | None) -> str:
    cur.execute(
        """
        INSERT INTO subjects (exam_id, name, section_label, is_syllabus_defined)
        VALUES (%s, %s, %s, TRUE)
        ON CONFLICT (exam_id, name) DO UPDATE
          SET section_label       = EXCLUDED.section_label,
              is_syllabus_defined = TRUE
        RETURNING id
        """,
        (exam_id, name.strip(), section),
    )
    return cur.fetchone()[0]


def _upsert_chapter(cur, subject_id: str, name: str, topics: list[str]) -> str:
    cur.execute(
        """
        INSERT INTO chapters
          (subject_id, name, canonical_name, syllabus_topics, is_syllabus_defined)
        VALUES (%s, %s, %s, %s, TRUE)
        ON CONFLICT (subject_id, name) DO UPDATE
          SET canonical_name      = EXCLUDED.canonical_name,
              syllabus_topics     = EXCLUDED.syllabus_topics,
              is_syllabus_defined = TRUE
        RETURNING id
        """,
        (subject_id, name.strip(), name.strip(), topics),
    )
    return cur.fetchone()[0]


# ─────────────────────────────────────────────────────────
#  Main entry point
# ─────────────────────────────────────────────────────────

def parse_and_store_syllabus(ocr_text: str, exam_id: str) -> dict:
    """
    Parse syllabus OCR text and store the subject/chapter tree in Postgres.
    """
    logger.info(f"[SyllabusParser] Parsing syllabus for exam {exam_id}")

    parsed    = _call_gemini_syllabus(ocr_text)
    subjects  = parsed.get("subjects", [])
    exam_name = parsed.get("exam_name", "")

    if not subjects:
        raise ValueError("No subjects found in syllabus")

    logger.info(f"[SyllabusParser] Found {len(subjects)} subjects")

    conn = psycopg2.connect(config.DATABASE_URL)
    cur  = conn.cursor()

    subjects_count = 0
    chapters_count = 0
    syllabus_tree  = []

    try:
        if exam_name:
            cur.execute(
                "UPDATE exams SET name = %s WHERE id = %s AND name = 'Unknown'",
                (exam_name, exam_id),
            )

        for subject_data in subjects:
            subject_name  = subject_data.get("name", "").strip()
            section_label = subject_data.get("section")
            chapters_data = subject_data.get("chapters", [])

            if not subject_name:
                continue

            subject_id = _upsert_subject(cur, exam_id, subject_name, section_label)
            subjects_count += 1

            subject_entry = {
                "subject_id":   str(subject_id),
                "subject_name": subject_name,
                "section":      section_label,
                "chapters":     [],
            }

            for chapter_data in chapters_data:
                chapter_name = chapter_data.get("name", "").strip()
                topics       = chapter_data.get("topics", [])

                if not chapter_name:
                    continue

                chapter_id = _upsert_chapter(cur, subject_id, chapter_name, topics)
                chapters_count += 1

                subject_entry["chapters"].append({
                    "chapter_id":   str(chapter_id),
                    "chapter_name": chapter_name,
                    "topics":       topics,
                })

            syllabus_tree.append(subject_entry)

        conn.commit()
        logger.info(
            f"[SyllabusParser] Stored {subjects_count} subjects, "
            f"{chapters_count} chapters"
        )

    except Exception as e:
        conn.rollback()
        logger.exception(f"[SyllabusParser] DB write failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

    return {
        "subjects_created": subjects_count,
        "chapters_created": chapters_count,
        "syllabus_tree":    syllabus_tree,
    }


# ─────────────────────────────────────────────────────────
#  Fetch syllabus tree from DB
#  Used by question_parser to get the canonical chapter list
# ─────────────────────────────────────────────────────────

def get_syllabus_tree(exam_id: str) -> list[dict]:
    """
    Returns the full subject → chapter → topics tree for an exam
    from Postgres. Used by the question parser prompt builder.
    """
    conn = psycopg2.connect(config.DATABASE_URL)
    cur  = conn.cursor()

    cur.execute(
        """
        SELECT
            s.id            AS subject_id,
            s.name          AS subject_name,
            s.section_label,
            c.id            AS chapter_id,
            c.name          AS chapter_name,
            c.syllabus_topics
        FROM subjects s
        JOIN chapters c ON c.subject_id = s.id
        WHERE s.exam_id             = %s
          AND c.is_syllabus_defined = TRUE
        ORDER BY s.section_label NULLS LAST, s.name, c.name
        """,
        (exam_id,),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    tree: dict[str, dict] = {}
    for row in rows:
        sid, sname, section, cid, cname, topics = row
        sid = str(sid)
        if sid not in tree:
            tree[sid] = {
                "subject_id":   sid,
                "subject_name": sname,
                "section":      section,
                "chapters":     [],
            }
        tree[sid]["chapters"].append({
            "chapter_id":   str(cid),
            "chapter_name": cname,
            "topics":       topics or [],
        })

    return list(tree.values())