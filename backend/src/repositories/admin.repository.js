/**
 * repositories/admin.repository.js
 *
 * All raw Postgres queries for admin operations.
 * No business logic here — only DB reads and writes.
 */

const pg = require("../db/pg");

// ─────────────────────────────────────────────────────────
//  EXAMS
// ─────────────────────────────────────────────────────────

async function upsertExamRepository(name, description) {
    const { rows } = await pg.query(
        `INSERT INTO exams (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, name, description, created_at`,
        [name.trim(), description || null]
    );
    return rows[0];
}

async function findAllExamsRepository() {
    const { rows } = await pg.query(
        `SELECT id, name, description, created_at
         FROM exams
         ORDER BY name ASC`
    );
    return rows;
}

async function findExamByIdRepository(examId) {
    const { rows } = await pg.query(
        `SELECT id, name, description FROM exams WHERE id = $1`,
        [examId]
    );
    return rows[0] || null;
}

// ─────────────────────────────────────────────────────────
//  QUESTION PAPERS
// ─────────────────────────────────────────────────────────

async function createPaperRepository(examId, year, fileUrl) {
    const { rows } = await pg.query(
        `INSERT INTO question_papers (exam_id, year, file_url, processed)
         VALUES ($1, $2, $3, FALSE)
         ON CONFLICT (exam_id, year) DO UPDATE
           SET file_url  = EXCLUDED.file_url,
               processed = FALSE
         RETURNING id`,
        [examId, year, fileUrl]
    );
    return rows[0].id;
}

async function findPaperByIdRepository(paperId) {
    const { rows } = await pg.query(
        `SELECT qp.*, e.id AS exam_id, e.name AS exam_name
         FROM question_papers qp
         JOIN exams e ON qp.exam_id = e.id
         WHERE qp.id = $1`,
        [paperId]
    );
    return rows[0] || null;
}

async function findPapersRepository(examId) {
    const query = examId
        ? `SELECT qp.id, qp.year, qp.processed, qp.created_at, e.name AS exam_name
           FROM question_papers qp
           JOIN exams e ON qp.exam_id = e.id
           WHERE qp.exam_id = $1
           ORDER BY qp.year DESC`
        : `SELECT qp.id, qp.year, qp.processed, qp.created_at, e.name AS exam_name
           FROM question_papers qp
           JOIN exams e ON qp.exam_id = e.id
           ORDER BY e.name ASC, qp.year DESC`;

    const { rows } = await pg.query(query, examId ? [examId] : []);
    return rows;
}

async function markPaperProcessedRepository(paperId, processed = true) {
    await pg.query(
        `UPDATE question_papers SET processed = $1 WHERE id = $2`,
        [processed, paperId]
    );
}

// ─────────────────────────────────────────────────────────
//  WEIGHTAGE STATS
// ─────────────────────────────────────────────────────────

async function findWeightageByExamRepository(examId) {
    const { rows } = await pg.query(
        `SELECT
            ws.year,
            ws.question_count,
            ws.total_marks,
            ws.weightage_pct,
            c.id   AS chapter_id,
            c.name AS chapter,
            s.name AS subject
         FROM weightage_stats ws
         JOIN chapters c ON ws.chapter_id = c.id
         JOIN subjects  s ON c.subject_id  = s.id
         WHERE ws.exam_id = $1
         ORDER BY ws.year DESC, ws.weightage_pct DESC`,
        [examId]
    );
    return rows;
}

// ─────────────────────────────────────────────────────────
//  PREDICTIONS
// ─────────────────────────────────────────────────────────

async function findPredictionsByExamYearRepository(examId, year) {
    const { rows } = await pg.query(
        `SELECT
            p.predicted_q_count,
            p.predicted_marks,
            p.predicted_weightage,
            p.confidence_score,
            p.model_version,
            p.generated_at,
            c.name AS chapter,
            s.name AS subject
         FROM predictions p
         JOIN chapters c ON p.chapter_id = c.id
         JOIN subjects  s ON c.subject_id  = s.id
         WHERE p.exam_id = $1 AND p.predicted_year = $2
         ORDER BY p.predicted_weightage DESC`,
        [examId, parseInt(year)]
    );
    return rows;
}


// repositories/admin.repository.js
async function findExamByNameRepository(name) {
    const { rows } = await pg.query(
        `SELECT id, name, description FROM exams WHERE LOWER(name) = LOWER($1)`,
        [name.trim()]
    );
    return rows[0] || null;
}

module.exports = {
    // exams
    upsertExamRepository,
    findAllExamsRepository,
    findExamByIdRepository,
    findExamByNameRepository,
    // papers
    createPaperRepository,
    findPaperByIdRepository,
    findPapersRepository,
    markPaperProcessedRepository,
    // weightage
    findWeightageByExamRepository,
    // predictions
    findPredictionsByExamYearRepository,
};