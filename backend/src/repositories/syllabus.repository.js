/**
 * repositories/syllabus.repository.js
 *
 * All raw Postgres queries for syllabus operations.
 * Called only by admin.services.js — no business logic here.
 */

const pg = require("../db/pg");

// ─────────────────────────────────────────────────────────
//  SYLLABUS RECORD
// ─────────────────────────────────────────────────────────

/**
 * Upsert a syllabus record for an exam.
 * One syllabus per exam — re-uploading replaces the previous one.
 */
async function upsertSyllabusRepository(examId, fileUrl, ocrText) {
    const { rows } = await pg.query(
        `INSERT INTO exam_syllabi (exam_id, file_url, ocr_text, parsed)
         VALUES ($1, $2, $3, FALSE)
         ON CONFLICT (exam_id) DO UPDATE
           SET file_url  = EXCLUDED.file_url,
               ocr_text  = EXCLUDED.ocr_text,
               parsed    = FALSE,
               created_at = now()
         RETURNING id`,
        [examId, fileUrl, ocrText || null]
    );
    return rows[0].id;
}

async function markSyllabusParsedRepository(examId) {
    await pg.query(
        `UPDATE exam_syllabi SET parsed = TRUE WHERE exam_id = $1`,
        [examId]
    );
}

async function findSyllabusByExamRepository(examId) {
    const { rows } = await pg.query(
        `SELECT id, file_url, parsed, created_at
         FROM exam_syllabi
         WHERE exam_id = $1`,
        [examId]
    );
    return rows[0] || null;
}

// ─────────────────────────────────────────────────────────
//  SYLLABUS TREE — read from subjects + chapters
// ─────────────────────────────────────────────────────────

/**
 * Returns the full subject → chapter → topics tree
 * for an exam, only from syllabus-defined entries.
 * Used to populate the exam-mode upload dropdowns.
 */
async function getSyllabusTreeRepository(examId) {
    const { rows } = await pg.query(
        `SELECT
            s.id             AS subject_id,
            s.name           AS subject_name,
            s.section_label,
            c.id             AS chapter_id,
            c.name           AS chapter_name,
            c.syllabus_topics
         FROM subjects s
         JOIN chapters c ON c.subject_id = s.id
         WHERE s.exam_id            = $1
           AND s.is_syllabus_defined = TRUE
         ORDER BY s.section_label NULLS LAST, s.name ASC, c.name ASC`,
        [examId]
    );

    // Group by subject
    const subjectMap = new Map();

    for (const row of rows) {
        const sid = row.subject_id;
        if (!subjectMap.has(sid)) {
            subjectMap.set(sid, {
                subject_id:   sid,
                subject_name: row.subject_name,
                section:      row.section_label,
                chapters:     [],
            });
        }
        subjectMap.get(sid).chapters.push({
            chapter_id:   row.chapter_id,
            chapter_name: row.chapter_name,
            topics:       row.syllabus_topics || [],
        });
    }

    return Array.from(subjectMap.values());
}

/**
 * Returns only subjects (no chapters) for an exam.
 * Used for the subject dropdown on the upload form.
 */
async function getSyllabusSubjectsRepository(examId) {
    const { rows } = await pg.query(
        `SELECT id, name, section_label
         FROM subjects
         WHERE exam_id            = $1
           AND is_syllabus_defined = TRUE
         ORDER BY section_label NULLS LAST, name ASC`,
        [examId]
    );
    return rows;
}

/**
 * Returns only chapters for a given subject.
 * Used for the chapter dropdown on the upload form.
 */
async function getSyllabusChaptersRepository(subjectId) {
    const { rows } = await pg.query(
        `SELECT id, name, syllabus_topics
         FROM chapters
         WHERE subject_id        = $1
           AND is_syllabus_defined = TRUE
         ORDER BY name ASC`,
        [subjectId]
    );
    return rows;
}

module.exports = {
    upsertSyllabusRepository,
    markSyllabusParsedRepository,
    findSyllabusByExamRepository,
    getSyllabusTreeRepository,
    getSyllabusSubjectsRepository,
    getSyllabusChaptersRepository,
};