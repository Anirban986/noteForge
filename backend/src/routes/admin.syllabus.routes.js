/**
 * routes/admin.routes.js — SYLLABUS ROUTE ADDITIONS
 *
 * Add these routes to your existing admin.routes.js.
 * All routes are protected by the existing adminAuth middleware.
 *
 * New endpoints:
 *   POST /api/admin/exams/:examId/syllabus/upload   upload syllabus PDF
 *   GET  /api/admin/exams/:examId/syllabus          syllabus status + tree
 *
 * User-facing (no admin gate — needed for upload form dropdowns):
 *   GET  /api/exams/:examId/tree                    full subject→chapter tree
 *   GET  /api/exams/:examId/subjects                subjects for exam
 *   GET  /api/subjects/:subjectId/chapters          chapters for subject
 *
 * ─────────────────────────────────────────────────────────
 * Add to admin.routes.js (admin-gated endpoints):
 */

// In admin.routes.js — after existing paper routes, add:

/*
const syllabusController = require("../controllers/admin.syllabus.controllers");

// Syllabus upload — admin only
router.post(
    "/exams/:examId/syllabus/upload",
    upload.single("file"),               // reuse existing multer instance
    syllabusController.uploadSyllabusController
);

// Syllabus status — admin only
router.get(
    "/exams/:examId/syllabus",
    syllabusController.getSyllabusStatusController
);
*/

// ─────────────────────────────────────────────────────────
// In notes.routes.js — user-facing, no admin gate needed
// Replace the existing /exams and /subjects routes with these:
//
// router.get("/exams/:examId/tree",
//     userMiddleware.userMiddleware,
//     syllabusController.getSyllabusTreeController
// );
//
// router.get("/exams/:examId/subjects",
//     userMiddleware.userMiddleware,
//     syllabusController.getSyllabusSubjectsController
// );
//
// router.get("/subjects/:subjectId/chapters",
//     userMiddleware.userMiddleware,
//     syllabusController.getSyllabusChaptersController
// );
// ─────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────
//  FastAPI: POST /api/ingest/syllabus
//  Add this to routes/ingest.py alongside /ingest and /ingest/paper
// ─────────────────────────────────────────────────────────

const FASTAPI_SYLLABUS_ROUTE = `
from services.syllabus_parser import parse_and_store_syllabus
from services.ingest_service  import download_pdf, load_pdf_images, extract_pages, cleanup_temp_file

class SyllabusIngestRequest(BaseModel):
    pdf_url: HttpUrl
    exam_id: str

@router.post("/ingest/syllabus")
async def ingest_syllabus(
    request:   SyllabusIngestRequest,
    x_api_key: str = Header(...)
):
    if x_api_key != config.INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    local_pdf_path = None

    try:
        # 1. Download and OCR the syllabus PDF
        # Reuse the exact same pipeline as question papers —
        # syllabi are small (1-3 pages) so this is fast.
        local_pdf_path = await run_in_threadpool(
            download_pdf, str(request.pdf_url)
        )
        images = await run_in_threadpool(load_pdf_images, local_pdf_path)
        pages  = await run_in_threadpool(extract_pages, images)

        # Concatenate all pages into one text block
        ocr_text = "\\n\\n".join(pages[p] for p in sorted(pages.keys()))

        # 2. Parse syllabus structure and store in Postgres
        result = await run_in_threadpool(
            parse_and_store_syllabus,
            ocr_text=ocr_text,
            exam_id=request.exam_id,
        )

        return {
            "success":          True,
            "subjects_created": result["subjects_created"],
            "chapters_created": result["chapters_created"],
            "syllabus_tree":    result["syllabus_tree"],
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        logger.exception("Syllabus ingestion failed")
        raise HTTPException(status_code=500, detail="Syllabus ingestion failed")
    finally:
        cleanup_temp_file(local_pdf_path)
`;

// This string is provided as a copy-paste reference for routes/ingest.py
// It is not executed here — paste it into your ingest.py file.
module.exports = { FASTAPI_SYLLABUS_ROUTE };