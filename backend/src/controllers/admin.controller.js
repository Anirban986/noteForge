/**
 * controllers/admin.controllers.js
 *
 * Thin controllers — extract from req, call service, shape res.
 * No business logic, no DB calls, no file I/O here.
 */

const adminService = require("../services/admin.service");

// ─────────────────────────────────────────────────────────
//  EXAM CONTROLLERS
// ─────────────────────────────────────────────────────────

async function createExamController(req, res, next) {
    try {
        const { name, description } = req.body;
        const exam = await adminService.createExamService(name, description);

        return res.status(201).json({
            success: true,
            exam,
        });
    } catch (err) {
        next(err);
    }
}

async function getAllExamsController(req, res, next) {
    try {
        const exams = await adminService.getAllExamsService();

        return res.status(200).json({
            success: true,
            exams,
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  PAPER CONTROLLERS
// ─────────────────────────────────────────────────────────

async function uploadPaperController(req, res, next) {
    try {
        const { exam_id, exam_name, year } = req.body;
 
        // Accept either exam_id (DB-backed) or exam_name (static data / dev)
        const result = await adminService.uploadPaperService(
            req.file,
            exam_id || null,    // UUID if frontend sends it
            exam_name || null,  // name string if frontend sends it
            year
        );
 
        return res.status(202).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function reprocessPaperController(req, res, next) {
    try {
        const result = await adminService.reprocessPaperService(req.params.id);

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (err) {
        next(err);
    }
}

async function getPapersController(req, res, next) {
    try {
        const papers = await adminService.getPapersService(req.query.exam_id);

        return res.status(200).json({
            success: true,
            papers,
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  WEIGHTAGE CONTROLLER
// ─────────────────────────────────────────────────────────

async function getWeightageController(req, res, next) {
    try {
        const weightage = await adminService.getWeightageService(req.params.examId);

        return res.status(200).json({
            success: true,
            weightage,
        });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────────────────
//  ML CONTROLLERS
// ─────────────────────────────────────────────────────────

async function trainModelController(req, res, next) {
    try {
        const result = await adminService.trainModelService(req.body.exam_id);

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (err) {
        next(err);
    }
}

async function predictController(req, res, next) {
    try {
        const { exam_id, predict_year } = req.body;
        const result = await adminService.predictService(exam_id, predict_year);

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (err) {
        next(err);
    }
}

async function getPredictionsController(req, res, next) {
    try {
        const { examId, year } = req.params;
        const predictions = await adminService.getPredictionsService(examId, year);

        return res.status(200).json({
            success: true,
            predictions,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    // exams
    createExamController,
    getAllExamsController,
    // papers
    uploadPaperController,
    reprocessPaperController,
    getPapersController,
    // weightage
    getWeightageController,
    // ml
    trainModelController,
    predictController,
    getPredictionsController,
};