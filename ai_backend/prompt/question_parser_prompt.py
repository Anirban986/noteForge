"""
prompts/question_parser_prompt.py
--------------------------------------------------------------------
Builds the Llama prompt for question paper parsing.

Changes (v3):
  - Added `compact` parameter. When True, topic lists are stripped
    from the syllabus block entirely. This saves ~2000 tokens and is
    used by the Stage 2 / Stage 3 fallback in question_parser.py
    when the full prompt causes Groq to truncate the response.
  - Removed section_label from SUBJECT lines (v2 fix retained).
  - Explicit WRONG/RIGHT examples in mapping rules (v2 fix retained).
"""


def build_parser_prompt(
    ocr_text:      str,
    exam_hint:     str  = None,
    syllabus_tree: list = None,
    compact:       bool = False,   # True = strip topic lists to save tokens
) -> str:
    """
    Build the Llama prompt for question paper parsing.

    syllabus_tree : list returned by syllabus_parser.get_syllabus_tree()
                    When None, Llama infers chapter names freely (fallback).
    compact       : When True, topic lists are omitted from the syllabus
                    block. Use this when the full prompt causes truncation.
    """

    # ── Build syllabus section ────────────────────────────
    if syllabus_tree:
        syllabus_lines = ["OFFICIAL SYLLABUS (use these chapter_ids and names exactly):"]

        for subject in syllabus_tree:
            # Never append section_label — it causes the LLM to echo
            # "Section 1 - DBMS" back into chapter_name fields.
            syllabus_lines.append(f"\nSUBJECT: {subject['subject_name']}")

            for chapter in subject["chapters"]:
                if compact:
                    # Compact mode: chapter_id + name only, no topics.
                    # Saves ~2000 tokens for 40-chapter syllabus trees.
                    syllabus_lines.append(
                        f"  CHAPTER_ID={chapter['chapter_id']} | "
                        f"{chapter['chapter_name']}"
                    )
                else:
                    topic_preview = ", ".join(chapter["topics"][:6])
                    if len(chapter["topics"]) > 6:
                        topic_preview += "…"
                    syllabus_lines.append(
                        f"  CHAPTER_ID={chapter['chapter_id']} | "
                        f"{chapter['chapter_name']} | topics: {topic_preview}"
                    )

        syllabus_block = "\n".join(syllabus_lines)

        mapping_rules = """
MAPPING RULES (syllabus provided):
  1. Map EVERY question to the most relevant chapter from the syllabus above.
  2. Use the EXACT chapter_id from the syllabus (UUID format shown above).
  3. Use the EXACT chapter_name from the syllabus — copy it character-for-character.
     Do NOT prepend section numbers, section labels, or any other prefix.
     WRONG: "Section 1 - DBMS"      RIGHT: "DBMS"
     WRONG: "Section 2: Algorithms"  RIGHT: "Algorithms"
     WRONG: "Sec. 1 — Networks"      RIGHT: "Computer Networks"
  4. Use the EXACT subject_name from the syllabus — copy it character-for-character.
     Do NOT prepend section numbers, section labels, or any other prefix.
     WRONG: "Section 1 - Engineering Mathematics"  RIGHT: "Engineering Mathematics"
  5. Match based on topic overlap: look at the chapter's topic list and pick
     the chapter whose topics most closely match what the question tests.
  6. If a question spans two chapters, pick the one that is the PRIMARY skill tested.
  7. Only set confidence < 0.7 if the question genuinely does not match any
     chapter in the syllabus (e.g. a completely out-of-syllabus question).
  8. If no chapter matches at all, use:
       chapter_id = null, chapter_name = "Out of Syllabus", confidence = 0.3
"""
        output_schema = """
OUTPUT SCHEMA (return ONLY this JSON, no markdown, no preamble):
{
  "exam_name":    "<string>",
  "year":         <number>,
  "total_marks":  <number>,
  "sections": [
    {
      "section_label":      "<e.g. Q.1-Q.25>",
      "marks_per_question": <number>,
      "question_count":     <number>
    }
  ],
  "questions": [
    {
      "question_number":  <number>,
      "question_type":    "<MCQ|NAT|MSQ>",
      "has_diagram":      <true|false>,
      "chapter_id":       "<UUID from syllabus above, or null>",
      "chapter_name":     "<exact name from syllabus above — no section prefix>",
      "subject_name":     "<exact subject name from syllabus above — no section prefix>",
      "marks":            <number>,
      "topic_tags":       ["<matching topic from syllabus>", "<specific concept>"],
      "confidence":       <float 0.0-1.0>
    }
  ]
}
"""

    else:
        # Fallback: no syllabus uploaded
        syllabus_block = """
NO SYLLABUS UPLOADED YET.
Infer subject and chapter names from the question content.
Use these canonical subject names for GATE CS:
  "Engineering Mathematics", "Digital Logic",
  "Computer Organization and Architecture",
  "Programming and Data Structures", "Algorithms",
  "Theory of Computation", "Compiler Design",
  "Operating System", "Databases", "Computer Networks",
  "General Aptitude"
"""
        mapping_rules = """
MAPPING RULES (no syllabus, inference mode):
  1. Map every question to the most likely subject and chapter.
  2. Use consistent chapter names — do not vary names across questions.
  3. Do NOT prepend section numbers or labels to chapter or subject names.
  4. Set confidence based on how certain you are of the subject-chapter mapping.
"""
        output_schema = """
OUTPUT SCHEMA (return ONLY this JSON, no markdown, no preamble):
{
  "exam_name":    "<string>",
  "year":         <number>,
  "total_marks":  <number>,
  "sections": [
    {
      "section_label":      "<e.g. Q.1-Q.25>",
      "marks_per_question": <number>,
      "question_count":     <number>
    }
  ],
  "questions": [
    {
      "question_number":  <number>,
      "question_type":    "<MCQ|NAT|MSQ>",
      "has_diagram":      <true|false>,
      "chapter_id":       null,
      "chapter_name":     "<inferred chapter name — no section prefix>",
      "subject_name":     "<canonical subject name — no section prefix>",
      "marks":            <number>,
      "topic_tags":       ["<tag1>", "<tag2>"],
      "confidence":       <float 0.0-1.0>
    }
  ]
}
"""

    hint_block = f"\nEXAM HINT: {exam_hint}\n" if exam_hint else ""

    return f"""
You are an expert exam paper analyst specialising in competitive exams.

{hint_block}
{syllabus_block}

{mapping_rules}

SECTION DETECTION:
  Papers state: "Q.1 - Q.25 carry one mark each" — parse this for marks_per_question.
  total_marks = sum(marks_per_question × question_count) across all sections.

QUESTION TYPE:
  MCQ = Multiple choice (A/B/C/D options visible)
  NAT = Numerical answer type (blank to fill, no options)
  MSQ = Multiple select (more than one correct answer)

has_diagram = true if the question references a figure, circuit, graph,
tree, code snippet, or table embedded IN the question (not just in options).

{output_schema}

--- PAPER TEXT START ---
{ocr_text[:30000]}
--- PAPER TEXT END ---
""".strip()