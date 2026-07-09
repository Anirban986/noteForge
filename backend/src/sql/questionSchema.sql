-- ============================================================
--  ShortNote — Complete Postgres Schema
--  Engine  : PostgreSQL 15+
--  Run     : psql $DATABASE_URL -f schema.sql
--
--  Tables:
--    exams              — top-level exam entries
--    exam_syllabi       — one syllabus PDF per exam
--    subjects           — subjects within an exam
--    chapters           — chapters within a subject
--    question_papers    — one paper per exam per year
--    questions          — individual questions from a paper
--    weightage_stats    — aggregated marks per chapter per year
--    ml_features        — pre-computed ML feature rows
--    predictions        — ML model output for next year
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
--  exams
--
--  Top-level anchor. One row per exam type.
--  All other tables reference this via exam_id.
--
--  name         Unique exam name e.g. "GATE CS", "JEE Mains", "NEET"
--  description  Optional — shown in frontend dropdowns
-- ============================================================

CREATE TABLE exams (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT exams_name_unique UNIQUE (name)
);


-- ============================================================
--  exam_syllabi
--
--  Tracks the official syllabus PDF uploaded per exam.
--  One syllabus per exam — re-uploading replaces the previous.
--
--  file_url     S3 URI of the uploaded syllabus PDF
--  ocr_text     Raw OCR text extracted from the syllabus
--               Stored so we can re-parse without re-OCRing
--  parsed       FALSE = syllabus uploaded but Gemini parsing
--               not yet run. TRUE = subjects + chapters
--               populated in Postgres with is_syllabus_defined=TRUE
--
--  Design note:
--    UNIQUE (exam_id) enforces one active syllabus per exam.
--    ON DELETE CASCADE: deleting an exam removes its syllabus record.
-- ============================================================

CREATE TABLE exam_syllabi (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id     UUID        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    file_url    TEXT        NOT NULL,
    ocr_text    TEXT,
    parsed      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT syllabi_exam_unique UNIQUE (exam_id)
);


-- ============================================================
--  subjects
--
--  A subject belongs to exactly one exam.
--  "Physics" under GATE CS and "Physics" under NEET are
--  separate rows — scoped by exam_id.
--
--  section_label        Official section heading from syllabus
--                       e.g. "Section 1", "Section 4"
--                       NULL for subjects created via inference
--                       (no syllabus uploaded yet)
--
--  is_syllabus_defined  TRUE  = name came from official syllabus upload.
--                               This is the canonical name. Never rename.
--                       FALSE = name inferred by Gemini from question text.
--                               May be inconsistent across years.
--                               Reprocess papers after uploading syllabus
--                               to convert these to TRUE.
--
--  UNIQUE (exam_id, name): prevents duplicate subjects within same exam
--  while allowing the same name in different exams.
-- ============================================================

CREATE TABLE subjects (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id              UUID        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    name                 TEXT        NOT NULL,
    section_label        TEXT,
    is_syllabus_defined  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT subjects_exam_name_unique UNIQUE (exam_id, name)
);


-- ============================================================
--  chapters
--
--  A chapter belongs to exactly one subject.
--  This is the core unit for weightage tracking and ML prediction.
--  chapter_id is the stable identifier the ML model trains on.
--
--  canonical_name       The authoritative chapter name.
--                       When is_syllabus_defined=TRUE, canonical_name = name
--                       (both come from the official syllabus).
--                       When is_syllabus_defined=FALSE, canonical_name may
--                       be set manually to group inconsistently-named chapters.
--                       NULL until manually reconciled.
--
--  syllabus_topics      Text array of specific topics listed under this
--                       chapter in the official syllabus.
--                       e.g. {"Propositional logic","First order logic","Sets"}
--                       Used in two ways:
--                         1. Passed to Gemini parser prompt so it can match
--                            questions to chapters by topic overlap
--                         2. GIN-indexed for topic search queries
--                       Empty array ({}) for inference-created chapters.
--
--  is_syllabus_defined  TRUE  = chapter came from official syllabus.
--                               name is canonical, syllabus_topics populated.
--                       FALSE = chapter created by Gemini inference.
--                               name may vary across papers/years.
--
--  UNIQUE (subject_id, name): prevents duplicate chapters within same subject.
--
--  ON DELETE CASCADE from subject: deleting a subject removes all its chapters.
-- ============================================================

CREATE TABLE chapters (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id           UUID        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name                 TEXT        NOT NULL,
    canonical_name       TEXT,
    syllabus_topics      TEXT[]      NOT NULL DEFAULT '{}',
    is_syllabus_defined  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chapters_subject_name_unique UNIQUE (subject_id, name)
);


-- ============================================================
--  question_papers
--
--  One row per exam per year — represents the source PDF.
--
--  file_url     S3 URI of the original PDF (s3://bucket/key)
--               Express derives the signed URL from this on demand.
--  ocr_text     Raw OCR text from Cloud Vision.
--               Stored as a checkpoint: if question parsing fails
--               or produces bad output, we can re-run Gemini on
--               the same OCR text without re-downloading the PDF.
--               Large (~50-200 KB) — move to S3 if storage is a concern.
--  processed    FALSE = OCR + question parsing still running
--                       (fire-and-forget from Express).
--               TRUE  = weightage_stats has been populated and
--                       the ML pipeline can be triggered.
--
--  UNIQUE (exam_id, year): re-uploading a paper for the same year
--  upserts rather than creating a duplicate.
-- ============================================================

CREATE TABLE question_papers (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id     UUID        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    year        SMALLINT    NOT NULL,
    file_url    TEXT        NOT NULL,
    ocr_text    TEXT,
    processed   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT papers_exam_year_unique UNIQUE (exam_id, year),
    CONSTRAINT papers_year_range       CHECK (year BETWEEN 1990 AND 2100)
);


-- ============================================================
--  questions
--
--  Individual questions extracted by Gemini from a paper.
--
--  chapter_id       NULLABLE. Set to NULL when:
--                     a) Gemini confidence < 0.7 (returned "Unclassified")
--                     b) No matching chapter found in syllabus tree
--                   Null-chapter questions are excluded from
--                   weightage_stats but kept for admin review.
--
--  question_type    MCQ = Multiple choice (A/B/C/D)
--                   NAT = Numerical answer type (fill in blank)
--                   MSQ = Multiple select (more than one correct)
--
--  has_diagram      TRUE if the question references a figure, circuit
--                   diagram, graph, code snippet or table embedded
--                   in the question body. Diagram questions are
--                   harder to map and tend to have lower confidence.
--
--  topic_tags       Postgres text array of matched syllabus topics
--                   e.g. {"Topological sort","Directed graph","DAG"}
--                   Comes from the syllabus chapter's topic list.
--                   Enables frequency analysis:
--                     SELECT unnest(topic_tags), COUNT(*)
--                     FROM questions GROUP BY 1 ORDER BY 2 DESC
--                   This drives the "hot topics" section in exam-mode notes.
--
--  confidence       Gemini's chapter mapping confidence (0.0-1.0).
--                   With syllabus: confidence of topic match.
--                   Without syllabus: confidence of inferred chapter.
--                   Stored for filtering: exclude low-confidence mappings
--                   from weightage aggregation if needed.
--
--  question_text    First ~200 chars of question text from Gemini parser.
--                   Not the full question — vector store has complete text.
--                   Enough for admin review and topic tag verification.
--
--  ON DELETE CASCADE from paper: deleting a paper removes its questions.
--  ON DELETE SET NULL from chapter: if a chapter is merged or removed,
--    its questions become unlinked rather than deleted. This preserves
--    paper question counts for historical accuracy.
-- ============================================================

CREATE TABLE questions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id        UUID        NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
    chapter_id      UUID        REFERENCES chapters(id) ON DELETE SET NULL,
    question_text   TEXT        NOT NULL,
    question_type   TEXT        NOT NULL DEFAULT 'MCQ'
                                CHECK (question_type IN ('MCQ', 'NAT', 'MSQ')),
    has_diagram     BOOLEAN     NOT NULL DEFAULT FALSE,
    marks           SMALLINT    NOT NULL DEFAULT 4,
    question_number SMALLINT,
    topic_tags      TEXT[]      NOT NULL DEFAULT '{}',
    confidence      FLOAT       NOT NULL DEFAULT 0.9,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT questions_marks_positive    CHECK (marks > 0),
    CONSTRAINT questions_confidence_range  CHECK (confidence BETWEEN 0.0 AND 1.0)
);


-- ============================================================
--  weightage_stats
--
--  Aggregated per chapter per exam per year.
--  Computed by question_parser.py after each paper is processed.
--  This is the primary table the ML model trains on.
--
--  Both chapter_id and exam_id are stored directly here
--  (even though exam_id is reachable via chapter→subject→exam)
--  because every ML query and chart query filters by exam_id first.
--  The denormalized FK makes those queries a single-table scan.
--
--  weightage_pct    (total_marks / paper_total_marks) × 100
--                   Stored as a percentage, not a ratio.
--                   Used directly in charts and as the ML target variable.
--
--  UNIQUE (chapter_id, exam_id, year): reprocessing a paper upserts
--  these rows rather than creating duplicates.
--
--  ON DELETE CASCADE from chapter and exam: if either is deleted,
--  their historical stats go with them.
-- ============================================================

CREATE TABLE weightage_stats (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id     UUID        NOT NULL REFERENCES chapters(id)  ON DELETE CASCADE,
    exam_id        UUID        NOT NULL REFERENCES exams(id)     ON DELETE CASCADE,
    year           SMALLINT    NOT NULL,
    question_count SMALLINT    NOT NULL DEFAULT 0,
    total_marks    SMALLINT    NOT NULL DEFAULT 0,
    weightage_pct  FLOAT       NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT weightage_chapter_exam_year_unique UNIQUE (chapter_id, exam_id, year),
    CONSTRAINT weightage_year_range          CHECK (year BETWEEN 1990 AND 2100),
    CONSTRAINT weightage_question_count_nneg CHECK (question_count >= 0),
    CONSTRAINT weightage_total_marks_nneg    CHECK (total_marks    >= 0),
    CONSTRAINT weightage_pct_range           CHECK (weightage_pct  BETWEEN 0 AND 100)
);


-- ============================================================
--  ml_features
--
--  Pre-computed feature rows for model training.
--  Written by build_features.py after each paper is processed.
--  One row per chapter per year — training uses all rows,
--  prediction uses only the most recent row per chapter.
--
--  Storing separately from weightage_stats means:
--    a) Inspect features to debug why a prediction was made
--    b) Retrain without recomputing from weightage_stats
--    c) Full audit trail from raw data to model output
--
--  Feature columns:
--
--  q_count              Raw question count this year
--  marks_total          Raw total marks this year
--  weightage_pct        Raw weightage percentage this year
--
--  q_count_lag1         Previous year's question count
--  q_count_lag2         Two years ago question count
--  q_count_rolling3     3-year rolling average question count
--  weightage_lag1       Previous year's weightage_pct
--  weightage_rolling3   3-year rolling average weightage
--
--  q_trend              Linear slope over last 3 years
--                       Positive = chapter gaining importance
--                       Negative = chapter declining
--
--  streak_asked         Consecutive years chapter appeared (≥1 question)
--                       High streak = high confidence prediction
--
--  years_since_asked    Years since chapter last appeared
--                       0 = appeared this year
--                       Chapters with high gap are statistically "due"
--
--  gap_years            Average gap between historical appearances
--                       NULL when chapter has appeared only once
--                       (need ≥2 appearances to compute average gap)
--
--  All lag/rolling/trend columns are NULL when insufficient history.
--  build_features.py skips year index 0 (no prior data to compute from).
--  ml_predictor.py fills NULL with 0 via numpy nan_to_num before training.
-- ============================================================

CREATE TABLE ml_features (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id           UUID        NOT NULL REFERENCES chapters(id)  ON DELETE CASCADE,
    exam_id              UUID        NOT NULL REFERENCES exams(id)     ON DELETE CASCADE,
    year                 SMALLINT    NOT NULL,
    -- raw signals
    q_count              FLOAT,
    marks_total          FLOAT,
    weightage_pct        FLOAT,
    -- lag features
    q_count_lag1         FLOAT,
    q_count_lag2         FLOAT,
    -- rolling averages
    q_count_rolling3     FLOAT,
    weightage_lag1       FLOAT,
    weightage_rolling3   FLOAT,
    -- trend and pattern features
    q_trend              FLOAT,
    streak_asked         INTEGER,
    years_since_asked    INTEGER,
    gap_years            INTEGER,
    computed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ml_features_chapter_exam_year_unique UNIQUE (chapter_id, exam_id, year),
    CONSTRAINT ml_features_year_range CHECK (year BETWEEN 1990 AND 2100)
);


-- ============================================================
--  predictions
--
--  ML model output stored back to DB after each predict run.
--  One row per chapter per exam per predicted year.
--
--  model_version        Format: "gbm_v1_<exam_id_prefix>_<year>"
--                       e.g. "gbm_v1_a3f8c2_2025"
--                       Lets you track which model produced which
--                       prediction and compare across versions.
--
--  confidence_score     Heuristic confidence from ml_predictor.py
--                       based on streak, years_since, and gap_years.
--                       Range 0.0–1.0. NOT the model's raw output.
--                       Used by the frontend to set bar opacity
--                       in the prediction chart.
--
--  UNIQUE (chapter_id, exam_id, predicted_year): rerunning predictions
--  for the same year upserts rather than appending duplicates.
--
--  ON DELETE CASCADE from chapter and exam.
-- ============================================================

CREATE TABLE predictions (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id           UUID        NOT NULL REFERENCES chapters(id)  ON DELETE CASCADE,
    exam_id              UUID        NOT NULL REFERENCES exams(id)     ON DELETE CASCADE,
    predicted_year       SMALLINT    NOT NULL,
    predicted_q_count    FLOAT,
    predicted_marks      FLOAT,
    predicted_weightage  FLOAT,
    confidence_score     FLOAT,
    model_version        TEXT,
    generated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT predictions_chapter_exam_year_unique UNIQUE (chapter_id, exam_id, predicted_year),
    CONSTRAINT predictions_year_range          CHECK (predicted_year    BETWEEN 1990 AND 2100),
    CONSTRAINT predictions_confidence_range    CHECK (confidence_score  BETWEEN 0.0 AND 1.0),
    CONSTRAINT predictions_weightage_nneg      CHECK (predicted_weightage >= 0),
    CONSTRAINT predictions_q_count_nneg        CHECK (predicted_q_count   >= 0)
);


-- ============================================================
--  INDEXES
--
--  Naming convention: idx_{table}_{columns}
-- ============================================================

-- ── exam_syllabi ─────────────────────────────────────────
-- Fast lookup: does this exam have a syllabus?
CREATE INDEX idx_syllabi_exam_id
    ON exam_syllabi (exam_id);

-- ── subjects ─────────────────────────────────────────────
-- "List subjects for exam" — most frequent query on this table
CREATE INDEX idx_subjects_exam_id
    ON subjects (exam_id);

-- Filter syllabus-defined subjects only (used by syllabus tree queries)
CREATE INDEX idx_subjects_exam_syllabus
    ON subjects (exam_id, is_syllabus_defined);

-- ── chapters ─────────────────────────────────────────────
-- "List chapters for subject" — used by upload form dropdowns
CREATE INDEX idx_chapters_subject_id
    ON chapters (subject_id);

-- Filter syllabus-defined chapters only
CREATE INDEX idx_chapters_subject_syllabus
    ON chapters (subject_id, is_syllabus_defined);

-- GIN index on syllabus_topics array
-- Enables: WHERE syllabus_topics @> ARRAY['Propositional logic']
-- Used by question parser topic matching and hot-topics queries
CREATE INDEX idx_chapters_syllabus_topics
    ON chapters USING GIN (syllabus_topics);

-- ── question_papers ───────────────────────────────────────
-- Admin paper list filters by exam_id
CREATE INDEX idx_papers_exam_id
    ON question_papers (exam_id);

-- Processed-status check: "which papers need reprocessing?"
CREATE INDEX idx_papers_exam_year
    ON question_papers (exam_id, year);

-- ── questions ─────────────────────────────────────────────
-- weightage aggregation joins questions to papers
CREATE INDEX idx_questions_paper_id
    ON questions (paper_id);

-- weightage aggregation groups by chapter_id
-- topic_tags frequency query filters by chapter_id
CREATE INDEX idx_questions_chapter_id
    ON questions (chapter_id);

-- GIN index on topic_tags
-- Enables: SELECT unnest(topic_tags), COUNT(*) ... GROUP BY 1
-- Used for hot-topics analysis in exam-mode notes
CREATE INDEX idx_questions_topic_tags
    ON questions USING GIN (topic_tags);

-- Filter by question type (MCQ/NAT/MSQ)
CREATE INDEX idx_questions_type
    ON questions (paper_id, question_type);

-- ── weightage_stats ───────────────────────────────────────
-- Chart queries filter all chapters by exam_id
-- ML feature builder reads all years for an exam
CREATE INDEX idx_weightage_exam_id
    ON weightage_stats (exam_id);

-- ML feature builder reads year-ordered history per chapter
-- Most frequently hit index in the entire ML pipeline
CREATE INDEX idx_weightage_chapter_exam_year
    ON weightage_stats (chapter_id, exam_id, year ASC);

-- ── ml_features ───────────────────────────────────────────
-- ml_predictor.py reads features per (chapter, exam) ordered by year
CREATE INDEX idx_ml_features_chapter_exam_year
    ON ml_features (chapter_id, exam_id, year ASC);

-- DISTINCT ON query: get latest feature row per chapter
CREATE INDEX idx_ml_features_chapter_latest
    ON ml_features (chapter_id, exam_id, year DESC);

-- ── predictions ───────────────────────────────────────────
-- Chart overlay: "all predictions for exam X in year Y"
CREATE INDEX idx_predictions_exam_year
    ON predictions (exam_id, predicted_year);

-- Note detail page: fetch prediction for one chapter
CREATE INDEX idx_predictions_chapter_exam_year
    ON predictions (chapter_id, exam_id, predicted_year);


-- ============================================================
--  USEFUL VIEWS
--  Optional — not required but useful for admin queries
--  and debugging the ML pipeline.
-- ============================================================

-- ── v_chapter_summary ─────────────────────────────────────
-- One row per chapter showing its subject, exam, and whether
-- it came from the syllabus. Useful for admin dashboard.

CREATE OR REPLACE VIEW v_chapter_summary AS
SELECT
    c.id                    AS chapter_id,
    c.name                  AS chapter,
    c.canonical_name,
    c.is_syllabus_defined,
    array_length(c.syllabus_topics, 1) AS topic_count,
    s.name                  AS subject,
    s.section_label,
    e.name                  AS exam,
    e.id                    AS exam_id
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
JOIN exams    e ON s.exam_id    = e.id
ORDER BY e.name, s.section_label NULLS LAST, c.name;


-- ── v_weightage_history ────────────────────────────────────
-- Full denormalized weightage history with chapter and subject
-- names. Useful for chart queries and ML feature verification.

CREATE OR REPLACE VIEW v_weightage_history AS
SELECT
    ws.year,
    ws.question_count,
    ws.total_marks,
    ws.weightage_pct,
    c.id        AS chapter_id,
    c.name      AS chapter,
    s.name      AS subject,
    e.id        AS exam_id,
    e.name      AS exam
FROM weightage_stats ws
JOIN chapters c ON ws.chapter_id = c.id
JOIN subjects s ON c.subject_id  = s.id
JOIN exams    e ON ws.exam_id    = e.id
ORDER BY e.name, ws.year DESC, ws.weightage_pct DESC;


-- ── v_predictions_with_history ─────────────────────────────
-- Joins predictions with their most recent historical weightage.
-- Useful for the predictions chart (shows predicted vs historical average).

CREATE OR REPLACE VIEW v_predictions_with_history AS
SELECT
    p.predicted_year,
    p.predicted_q_count,
    p.predicted_marks,
    p.predicted_weightage,
    p.confidence_score,
    p.model_version,
    c.id        AS chapter_id,
    c.name      AS chapter,
    s.name      AS subject,
    e.id        AS exam_id,
    e.name      AS exam,
    -- historical average for comparison
    ROUND(AVG(ws.weightage_pct)::numeric,  2) AS hist_avg_weightage,
    ROUND(AVG(ws.question_count)::numeric, 1) AS hist_avg_questions,
    COUNT(ws.year)                            AS years_of_data
FROM predictions p
JOIN chapters c ON p.chapter_id = c.id
JOIN subjects s ON c.subject_id  = s.id
JOIN exams    e ON p.exam_id     = e.id
LEFT JOIN weightage_stats ws
    ON  ws.chapter_id = p.chapter_id
    AND ws.exam_id    = p.exam_id
GROUP BY
    p.predicted_year, p.predicted_q_count, p.predicted_marks,
    p.predicted_weightage, p.confidence_score, p.model_version,
    c.id, c.name, s.name, e.id, e.name
ORDER BY p.predicted_weightage DESC;


-- ============================================================
--  SEED: optional default exam entries
--  Uncomment and run after initial schema creation.
--  Then upload the syllabus PDF for each exam via the admin API.
-- ============================================================

-- INSERT INTO exams (name, description) VALUES
--     ('GATE CS',    'Graduate Aptitude Test in Engineering — Computer Science'),
--     ('GATE ECE',   'Graduate Aptitude Test in Engineering — Electronics'),
--     ('JEE Mains',  'Joint Entrance Examination — Mains'),
--     ('JEE Advanced','Joint Entrance Examination — Advanced (IITs)'),
--     ('NEET',       'National Eligibility cum Entrance Test'),
--     ('UPSC CSE',   'Union Public Service Commission — Civil Services');