const express          = require("express");
const router           = express.Router();
const notesController  = require("../controllers/notes.controllers");
const upload           = require("../middleware/notes.middleware");
const userMiddleware   = require("../middleware/user.middleware");
const premiumMiddleware = require("../middleware/premium.middleware");

// ─────────────────────────────────────────────────────────
//  EXISTING ROUTES — zero changes
// ─────────────────────────────────────────────────────────

router.post(
    "/upload",
    userMiddleware.userMiddleware,
    upload.single("file"),
    notesController.uploadNotesController
);

router.get(
    "/myNotes",
    userMiddleware.userMiddleware,
    notesController.getNotesController
);

router.delete(
    "/:id",
    userMiddleware.userMiddleware,
    notesController.deleteNotesController
);

router.post(
    "/premium/upload",
    userMiddleware.userMiddleware,
    premiumMiddleware.premiumMiddleware,
    upload.single("file"),
    notesController.uploadNotesController
);

router.get(
    "/premium/myNotes",
    userMiddleware.userMiddleware,
    premiumMiddleware.premiumMiddleware,
    notesController.getNotesController
);

router.get(
    "/countDocs",
    userMiddleware.userMiddleware,
    notesController.countDocumentController
);

// ─────────────────────────────────────────────────────────
//  NEW: exam dropdown data
//  These are called by the frontend when the user opens the
//  exam-mode upload form to populate the three dropdowns:
//  exam → subject → chapter (each depends on the previous).
//
//  No premium gate — all users see the exam list so they
//  know what's available before upgrading.
// ─────────────────────────────────────────────────────────

// List all exams
router.get(
    "/exams",
    userMiddleware.userMiddleware,
    notesController.getExamsController
);

// Subjects for a given exam
router.get(
    "/exams/:examId/subjects",
    userMiddleware.userMiddleware,
    notesController.getSubjectsController
);

// Chapters for a given subject
router.get(
    "/subjects/:subjectId/chapters",
    userMiddleware.userMiddleware,
    notesController.getChaptersController
);

// ─────────────────────────────────────────────────────────
//  NEW: premium — weightage + chart data
//  Premium gate applied — non-premium users get 403.
// ─────────────────────────────────────────────────────────

// Weightage history + ML prediction for one chapter
// Used to render the per-chapter detail panel
router.get(
    "/premium/weightage/:examId/:chapterId",
    userMiddleware.userMiddleware,
    premiumMiddleware.premiumMiddleware,
    notesController.getWeightageController
);

// Full chart data for an exam (bar + line + prediction overlay)
// Used to render the exam dashboard charts
router.get(
    "/premium/charts/:examId",
    userMiddleware.userMiddleware,
    premiumMiddleware.premiumMiddleware,
    notesController.getChartDataController
);

module.exports = router;