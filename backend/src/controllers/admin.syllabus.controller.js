/**
 * controllers/admin.syllabus.controllers.js
 *
 * Thin controllers for syllabus endpoints.
 * Add to existing admin.controllers.js exports or keep separate.
 */

const syllabusService = require("../services/admin.syllabus.service");

// ─────────────────────────────────────────────────────────
//  POST /api/admin/exams/:examId/syllabus/upload
// ─────────────────────────────────────────────────────────

async function uploadSyllabusController(req, res, next) {
    try {
        const { exam_id, exam_name } = req.body;
 
        const result = await syllabusService.uploadSyllabusService(
            req.file,
            exam_id   || null,
            exam_name || null,
        );
 
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  GET /api/admin/exams/:examId/syllabus
//  Returns syllabus status + full tree.
// ─────────────────────────────────────────────────────────

async function getSyllabusStatusController(req, res, next) {
    try {
        const data = await syllabusService.getSyllabusStatusService(req.params.examId);
        return res.status(200).json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  GET /api/exams/:examId/tree
//  Public — used by frontend to populate upload dropdowns.
//  Returns subject → chapter hierarchy.
// ─────────────────────────────────────────────────────────

async function getSyllabusTreeController(req, res, next) {
    try {
        const tree = await syllabusService.getSyllabusTreeService(req.params.examId);
        return res.status(200).json({ success: true, tree });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  GET /api/exams/:examId/subjects
//  Returns just subjects (no chapters) for a given exam.
// ─────────────────────────────────────────────────────────

async function getSyllabusSubjectsController(req, res, next) {
    try {
        const subjects = await syllabusService.getSyllabusSubjectsService(req.params.examId);
        return res.status(200).json({ success: true, subjects });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  GET /api/subjects/:subjectId/chapters
//  Returns chapters for a given subject.
// ─────────────────────────────────────────────────────────

async function getSyllabusChaptersController(req, res, next) {
    try {
        const chapters = await syllabusService.getSyllabusChaptersService(req.params.subjectId);
        return res.status(200).json({ success: true, chapters });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    uploadSyllabusController,
    getSyllabusStatusController,
    getSyllabusTreeController,
    getSyllabusSubjectsController,
    getSyllabusChaptersController,
};