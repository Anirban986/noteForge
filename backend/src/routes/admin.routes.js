/**
 * routes/admin.routes.js
 */

const express           = require("express");
const adminController   = require("../controllers/admin.controller");
const adminUpload       = require("../middleware/admin.upload.middleware");
const { userMiddleware, adminMiddleware } = require("../middleware/user.middleware");
const syllabusController = require("../controllers/admin.syllabus.controller");
const router = express.Router();

// Both auth middlewares must run in sequence
const adminAuth = [userMiddleware, adminMiddleware];

// ── EXAM ROUTES ───────────────────────────────────────────
router.post("/exams",  ...adminAuth, adminController.createExamController);
router.get("/exams",   ...adminAuth, adminController.getAllExamsController);

// ── PAPER ROUTES ──────────────────────────────────────────
// adminUpload.single("file") uploads directly to S3 via multer-s3
// req.file.key and req.file.location are available in the controller
router.post("/papers/upload",      ...adminAuth, adminUpload.single("file"), adminController.uploadPaperController);
router.post("/papers/:id/process", ...adminAuth, adminController.reprocessPaperController);
router.get("/papers",              ...adminAuth, adminController.getPapersController);

// ── SYLLABUS ROUTE ────────────────────────────────────────
router.post("/syllabus/upload",    ...adminAuth, adminUpload.single("file"), syllabusController.uploadSyllabusController);

// ── WEIGHTAGE ROUTE ───────────────────────────────────────
router.get("/weightage/:examId",   ...adminAuth, adminController.getWeightageController);

// ── ML ROUTES ─────────────────────────────────────────────
router.post("/ml/train",                 ...adminAuth, adminController.trainModelController);
router.post("/ml/predict",               ...adminAuth, adminController.predictController);
router.get("/predictions/:examId/:year", ...adminAuth, adminController.getPredictionsController);

// ── ERROR HANDLER ─────────────────────────────────────────
router.use((err, req, res, next) => {
    console.error("[AdminRoutes] Unhandled error:", err.message);
    res.status(500).json({ success: false, error: err.message });
});

module.exports = router;