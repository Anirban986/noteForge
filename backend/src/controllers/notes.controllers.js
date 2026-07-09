const notesService = require("../services/notes.services");

// ─────────────────────────────────────────────────────────
//  EXISTING CONTROLLERS — zero changes
// ─────────────────────────────────────────────────────────

async function uploadNotesController(req, res, next) {
    try {
        const note = await notesService.uploadFileService(
            req.user.id,
            req.file,
            req.body.mode,
            {
                exam:    req.body.exam,
                examId:  req.body.examId,   // added: PG exam UUID
                subject: req.body.subject,
                chapter: req.body.chapter,
                topic:   req.body.topic,
            }
        );

        return res.status(201).json({
            success: true,
            message: "File uploaded successfully",
            note,
        });
    } catch (err) {
        next(err);
    }
}

async function getNotesController(req, res, next) {
    try {
        const filters = {
            mode:    req.query.mode || "Normal",
            exam:    req.query.exam,
            subject: req.query.subject,
            chapter: req.query.chapter,
        };

        const notes = await notesService.getUserNotesService(
            req.user.id,
            filters
        );

        return res.status(200).json({ success: true, notes });
    } catch (err) {
        next(err);
    }
}

async function deleteNotesController(req, res, next) {
    try {
        const note = await notesService.deleteNoteService(
            req.params.id,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "Note deleted successfully",
            note,
        });
    } catch (err) {
        next(err);
    }
}

async function countDocumentController(req, res, next) {
    try {
        const counts = await notesService.countDocumentsService(req.user.id);

        return res.status(200).json({ success: true, counts });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  NEW: weightage history + ML prediction for one chapter
//  GET /premium/weightage/:examId/:chapterId
//  Premium only — gated in router via premiumMiddleware
// ─────────────────────────────────────────────────────────

async function getWeightageController(req, res, next) {
    try {
        const { examId, chapterId } = req.params;

        if (!examId || !chapterId) {
            return res.status(400).json({
                success: false,
                message: "examId and chapterId are required",
            });
        }

        const data = await notesService.getWeightageService(examId, chapterId);

        return res.status(200).json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  NEW: full chart data for an exam
//  GET /premium/charts/:examId
//  Returns byChapter, byYear, predictions arrays
//  ready for direct use in chart components
// ─────────────────────────────────────────────────────────

async function getChartDataController(req, res, next) {
    try {
        const { examId } = req.params;

        if (!examId) {
            return res.status(400).json({
                success: false,
                message: "examId is required",
            });
        }

        const data = await notesService.getChartDataService(examId);

        return res.status(200).json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  NEW: list all exams (used to populate dropdown on
//  the exam-mode upload form)
//  GET /exams
// ─────────────────────────────────────────────────────────

async function getExamsController(req, res, next) {
    try {
        const exams = await notesService.getExamsService();
        return res.status(200).json({ success: true, exams });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  NEW: subjects for a given exam
//  GET /exams/:examId/subjects
// ─────────────────────────────────────────────────────────

async function getSubjectsController(req, res, next) {
    try {
        const subjects = await notesService.getSubjectsService(req.params.examId);
        return res.status(200).json({ success: true, subjects });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  NEW: chapters for a given subject
//  GET /subjects/:subjectId/chapters
// ─────────────────────────────────────────────────────────

async function getChaptersController(req, res, next) {
    try {
        const chapters = await notesService.getChaptersService(req.params.subjectId);
        return res.status(200).json({ success: true, chapters });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    // existing
    uploadNotesController,
    getNotesController,
    deleteNotesController,
    countDocumentController,
    // new
    getWeightageController,
    getChartDataController,
    getExamsController,
    getSubjectsController,
    getChaptersController,
};