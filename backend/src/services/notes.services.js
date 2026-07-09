const notesRepository = require("../repositories/notes.repository");
const userRepository   = require("../repositories/user.repository");
const storageService   = require("./storage.services");
const { callIngestService, callAIService } = require("./ai.service");
const pg = require("../db/pg");

// ─────────────────────────────────────────────────────────
//  HELPER — resolve exam UUID from name or id
//  Frontend sends exam as a name string ("GATE CS 2026").
//  Postgres needs the UUID. Look it up here.
// ─────────────────────────────────────────────────────────

async function resolveExamId(examId, examName) {
    // Already have UUID — just verify it exists
    if (examId) {
        const { rows } = await pg.query(
            `SELECT id, name FROM exams WHERE id = $1`,
            [examId]
        );
        return rows[0] || null;
    }

    // Resolve by name
    if (!examName) return null;

    const { rows } = await pg.query(
        `SELECT id, name FROM exams WHERE LOWER(name) = LOWER($1)`,
        [examName.trim()]
    );
    return rows[0] || null;
}

// ─────────────────────────────────────────────────────────
//  HELPER — fetch weightage history + ML prediction
// ─────────────────────────────────────────────────────────

async function fetchExamContext(examId, subject, chapter) {
    if (!examId || !subject || !chapter) return { history: [], prediction: null };

    try {
        const { rows: history } = await pg.query(
            `SELECT
                ws.year,
                ws.question_count,
                ws.total_marks,
                ws.weightage_pct
             FROM weightage_stats ws
             JOIN chapters c ON ws.chapter_id = c.id
             JOIN subjects  s ON c.subject_id  = s.id
             WHERE ws.exam_id = $1
               AND s.name    ILIKE $2
               AND c.name    ILIKE $3
             ORDER BY ws.year DESC
             LIMIT 10`,
            [examId, `%${subject}%`, `%${chapter}%`]
        );

        const nextYear = new Date().getFullYear() + 1;
        const { rows: predRows } = await pg.query(
            `SELECT
                p.predicted_q_count,
                p.predicted_marks,
                p.predicted_weightage,
                p.confidence_score
             FROM predictions p
             JOIN chapters c ON p.chapter_id = c.id
             JOIN subjects  s ON c.subject_id  = s.id
             WHERE p.exam_id        = $1
               AND s.name           ILIKE $2
               AND c.name           ILIKE $3
               AND p.predicted_year = $4
             LIMIT 1`,
            [examId, `%${subject}%`, `%${chapter}%`, nextYear]
        );

        console.log(
            `[ExamContext] exam=${examId} subject=${subject} chapter=${chapter} ` +
            `→ ${history.length} history rows, prediction=${predRows[0] ? "found" : "none"}`
        );

        return {
            history,
            prediction: predRows[0] || null,
        };
    } catch (err) {
        console.warn("[ExamContext] Could not fetch context:", err.message);
        return { history: [], prediction: null };
    }
}

// ─────────────────────────────────────────────────────────
//  uploadFileService
// ─────────────────────────────────────────────────────────

async function uploadFileService(userId, file, mode, metadata) {
    if (!file) throw new Error("File is required");

    const user = await userRepository.findUserById(userId);
    if (!user)  throw new Error("User not found");

    if (user.plan === "free") {
        const count = await notesRepository.countByuserIdrepository(userId);
        if (count >= 5) throw new Error("Free plan allows only 5 uploads");
    }

    if (mode === "Exam" && user.plan !== "premium") {
        throw new Error("Exam mode is a premium feature");
    }

    const fileUrl = file.location;
    const key     = file.key;
    let   note    = null;

    try {
        // ── 1. Resolve exam UUID (exam mode only) ─────────
        // Frontend sends metadata.exam = "GATE CS 2026" (name string).
        // metadata.examId may also be sent if frontend has the UUID.
        // Either way, resolve to a Postgres UUID here.
        let resolvedExamId   = null;
        let resolvedExamName = null;

        if (mode === "Exam") {
            const exam = await resolveExamId(
                metadata?.examId  || null,
                metadata?.exam    || null,   // "exam" is the name field from frontend
            );

            if (exam) {
                resolvedExamId   = exam.id;
                resolvedExamName = exam.name;
                console.log(`[UploadService] Resolved exam: "${resolvedExamName}" → ${resolvedExamId}`);
            } else {
                console.warn(
                    `[UploadService] Exam not found in Postgres: "${metadata?.exam}". ` +
                    `weightageSnapshot and prediction will be empty. ` +
                    `Make sure the exam name in the upload form matches exactly what's in the DB.`
                );
            }
        }

        // ── 2. Create note document (pending) ─────────────
        note = await notesRepository.createFilesRepository({
            userId,
            OriginalFileName: file.originalname,
            fileUrl,
            fileSize:  file.size,
            mimeType:  file.mimetype,
            mode:      mode || "Normal",
            aiStatus:  "processing",
            // Store resolved UUID — not the raw metadata.examId which may be null
            examId:    resolvedExamId  || null,
            subject:   metadata?.subject || null,
            chapter:   metadata?.chapter || null,
        });

        // ── 3. Signed URL for AI service ──────────────────
        const signedUrl = await storageService.generateSignedUrl(key);

        // ── 4. Ingest (OCR + embeddings) ──────────────────
        const ingestResult = await callIngestService(
            signedUrl,
            user._id.toString(),
            note._id.toString()
        );

        // ── 5. Fetch exam context from Postgres ───────────
        // Now uses resolvedExamId (the actual UUID) instead of
        // metadata.examId (which was null before this fix)
        let examContext = { history: [], prediction: null };

        if (mode === "Exam" && resolvedExamId) {
            examContext = await fetchExamContext(
                resolvedExamId,
                metadata?.subject,
                metadata?.chapter
            );
        }

        // ── 6. AI note generation ─────────────────────────
        const aiData = await callAIService(
            mode,
            metadata,
            ingestResult.source,
            examContext
        );

        // ── 7. Flatten blocks ─────────────────────────────
        const title    = aiData?.title    || "Untitled Note";
        const overview = aiData?.overview || "";
        let   topics   = aiData?.topics   || [];
        let   blocks   = [];

        if (Array.isArray(topics)) {
            topics.forEach(t => {
                if (Array.isArray(t.blocks)) blocks.push(...t.blocks);
            });
        }

        if (!blocks.length && Array.isArray(aiData?.blocks)) {
            topics = [{ topic: title, blocks: aiData.blocks }];
            blocks = aiData.blocks;
        }

        if (!blocks.length) throw new Error("Invalid AI response: no blocks returned");

        // ── 8. Persist AI output + exam context snapshot ──
        await notesRepository.updateNoteWithAI(note._id, {
            title,
            overview,
            topics,
            blocks,
            aiStatus:          "completed",
            weightageSnapshot: examContext.history,
            prediction:        examContext.prediction,
        });

        return await notesRepository.findByIdrepository(note._id);

    } catch (err) {
        console.error("[UploadService] Pipeline error:", err.message);
        if (note?._id) await notesRepository.markeAsFailed(note._id, err.message);
        throw err;
    }
}

// ─────────────────────────────────────────────────────────
//  getUserNotesService — unchanged
// ─────────────────────────────────────────────────────────

async function getUserNotesService(userId, filters) {
    const mode  = filters.mode || "Normal";
    const query = { userId, isDeleted: false, mode };

    if (mode === "Exam") {
        if (filters.exam)    query.exam    = { $regex: filters.exam,    $options: "i" };
        if (filters.subject) query.subject = { $regex: filters.subject, $options: "i" };
        if (filters.chapter) query.chapter = { $regex: filters.chapter, $options: "i" };
    }

    const notes = await notesRepository.findWithQuery(query);

    return notes.map(note => ({
        ...note.toObject(),
        exam:              note.exam              || null,
        examId:            note.examId            || null,
        subject:           note.subject           || (mode === "Normal" ? "General" : null),
        chapter:           note.chapter           || null,
        weightageSnapshot: note.weightageSnapshot || [],
        prediction:        note.prediction        || null,
        blockSummary:      note.blockSummary      || {},
    }));
}

// ─────────────────────────────────────────────────────────
//  deleteNoteService — unchanged
// ─────────────────────────────────────────────────────────

async function deleteNoteService(noteId) {
    return await notesRepository.deleteByidrepositorty(noteId);
}

// ─────────────────────────────────────────────────────────
//  countDocumentsService — unchanged
// ─────────────────────────────────────────────────────────

async function countDocumentsService(userId) {
    const result = await notesRepository.countByUserIdWithModeRepository(userId);
    let counts = { normal: 0, exam: 0 };
    result.forEach(item => {
        counts[item._id.toLowerCase()] = item.count;
    });
    return counts;
}

// ─────────────────────────────────────────────────────────
//  getWeightageService — unchanged
// ─────────────────────────────────────────────────────────

async function getWeightageService(examId, chapterId) {
    const nextYear = new Date().getFullYear() + 1;

    const [histRes, predRes, chapterInfo] = await Promise.all([
        pg.query(
            `SELECT year, question_count, total_marks, weightage_pct
             FROM weightage_stats
             WHERE exam_id = $1 AND chapter_id = $2
             ORDER BY year ASC`,
            [examId, chapterId]
        ),
        pg.query(
            `SELECT predicted_year, predicted_q_count, predicted_marks,
                    predicted_weightage, confidence_score, model_version
             FROM predictions
             WHERE exam_id = $1 AND chapter_id = $2 AND predicted_year = $3
             LIMIT 1`,
            [examId, chapterId, nextYear]
        ),
        pg.query(
            `SELECT c.name AS chapter, s.name AS subject, e.name AS exam
             FROM chapters c
             JOIN subjects s ON c.subject_id = s.id
             JOIN exams    e ON s.exam_id    = e.id
             WHERE c.id = $1`,
            [chapterId]
        ),
    ]);

    return {
        chapter:    chapterInfo.rows[0] || {},
        history:    histRes.rows,
        prediction: predRes.rows[0] || null,
    };
}

// ─────────────────────────────────────────────────────────
//  getChartDataService — unchanged
// ─────────────────────────────────────────────────────────

async function getChartDataService(examId) {
    const nextYear = new Date().getFullYear() + 1;

    const [byChapterRes, byYearRes, predRes] = await Promise.all([
        pg.query(
            `SELECT
                c.id                                             AS chapter_id,
                c.name                                           AS chapter,
                s.name                                           AS subject,
                ROUND(AVG(ws.weightage_pct)::numeric, 2)         AS avg_weightage,
                ROUND(AVG(ws.question_count)::numeric, 1)        AS avg_questions,
                COUNT(ws.year)::int                              AS years_present,
                MAX(ws.year)                                     AS last_year,
                SUM(ws.question_count)::int                      AS total_questions
             FROM weightage_stats ws
             JOIN chapters c ON ws.chapter_id = c.id
             JOIN subjects  s ON c.subject_id  = s.id
             WHERE ws.exam_id = $1
             GROUP BY c.id, c.name, s.name
             ORDER BY avg_weightage DESC
             LIMIT 25`,
            [examId]
        ),
        pg.query(
            `SELECT
                ws.year,
                s.name                       AS subject,
                SUM(ws.question_count)::int  AS total_questions,
                SUM(ws.total_marks)::int     AS total_marks,
                ROUND(SUM(ws.weightage_pct)::numeric, 2) AS total_weightage
             FROM weightage_stats ws
             JOIN chapters c ON ws.chapter_id = c.id
             JOIN subjects  s ON c.subject_id  = s.id
             WHERE ws.exam_id = $1
             GROUP BY ws.year, s.id, s.name
             ORDER BY ws.year ASC, s.name ASC`,
            [examId]
        ),
        pg.query(
            `SELECT
                c.id             AS chapter_id,
                c.name           AS chapter,
                s.name           AS subject,
                p.predicted_weightage,
                p.predicted_q_count,
                p.predicted_marks,
                p.confidence_score
             FROM predictions p
             JOIN chapters c ON p.chapter_id = c.id
             JOIN subjects  s ON c.subject_id  = s.id
             WHERE p.exam_id = $1 AND p.predicted_year = $2
             ORDER BY p.predicted_weightage DESC
             LIMIT 25`,
            [examId, nextYear]
        ),
    ]);

    return {
        byChapter:   byChapterRes.rows,
        byYear:      byYearRes.rows,
        predictions: predRes.rows,
        nextYear,
    };
}

// ─────────────────────────────────────────────────────────
//  getExamsService — unchanged
// ─────────────────────────────────────────────────────────

async function getExamsService() {
    const { rows } = await pg.query(
        `SELECT id, name, description FROM exams ORDER BY name ASC`
    );
    return rows;
}

async function getSubjectsService(examId) {
    const { rows } = await pg.query(
        `SELECT id, name FROM subjects WHERE exam_id = $1 ORDER BY name ASC`,
        [examId]
    );
    return rows;
}

async function getChaptersService(subjectId) {
    const { rows } = await pg.query(
        `SELECT id, name FROM chapters WHERE subject_id = $1 ORDER BY name ASC`,
        [subjectId]
    );
    return rows;
}

module.exports = {
    uploadFileService,
    getUserNotesService,
    deleteNoteService,
    countDocumentsService,
    getWeightageService,
    getChartDataService,
    getExamsService,
    getSubjectsService,
    getChaptersService,
};