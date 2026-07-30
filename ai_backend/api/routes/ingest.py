"""
routes/ingest.py
----------------
Three ingest routes sharing the same underlying OCR pipeline:

  POST /api/ingest           — user note ingestion (unchanged)
  POST /api/ingest/paper     — admin question paper ingestion
  POST /api/ingest/syllabus  — admin syllabus ingestion (new)

All three reuse ingest_service.py for download + OCR.
Syllabus additionally calls syllabus_parser.parse_and_store_syllabus().
"""

from fastapi             import APIRouter, HTTPException, Header
from fastapi.concurrency import run_in_threadpool
from pydantic            import BaseModel, HttpUrl
import logging
import config

from services.ingest_service  import run, download_pdf, load_pdf_images, extract_pages, cleanup_temp_file
from services.question_parser import parse_and_store
from services.syllabus_parser import parse_and_store_syllabus

router = APIRouter()
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────
#  Request models
# ─────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    pdf_url: HttpUrl
    source:  str | None = None


class PaperIngestRequest(BaseModel):
    pdf_url:  HttpUrl
    exam_id:  str
    year:     int
    source:   str | None = None


class SyllabusIngestRequest(BaseModel):
    pdf_url:  HttpUrl
    exam_id:  str


# ─────────────────────────────────────────────────────────
#  POST /api/ingest — user notes (unchanged)
# ─────────────────────────────────────────────────────────

@router.post("/ingest")
async def ingest(
    request:   IngestRequest,
    x_api_key: str = Header(...),
):
    if x_api_key != config.INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        result = await run_in_threadpool(
            run,
            pdf_url=str(request.pdf_url),
            source=request.source,
            source_type="notes",
        )
        return {
            "success": True,
            "source":  result["source"],
            "pages":   result["pages"],
            "chunks":  result["chunks"],
            "failed":  result["failed"],
            "timings": result["timings"],
        }
    except ValueError as e:
        logger.exception("Validation error during note ingestion")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        logger.exception("Note ingestion pipeline failed")
        raise HTTPException(status_code=500, detail="Ingestion failed")


# ─────────────────────────────────────────────────────────
#  POST /api/ingest/paper — admin question papers
# ─────────────────────────────────────────────────────────

@router.post("/ingest/paper")
async def ingest_paper(
    request:   PaperIngestRequest,
    x_api_key: str = Header(...),
):
    if x_api_key != config.INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    source = request.source or f"paper_{request.exam_id}_{request.year}"

    try:
        # 1. OCR + embeddings
        result = await run_in_threadpool(
            run,
            pdf_url=str(request.pdf_url),
            source=source,
            source_type="question_paper",
            extra_metadata={
                "exam_id": request.exam_id,
                "year":    request.year,
            },
        )

        # 2. Gemini question → chapter mapping → Postgres
        parse_result = await run_in_threadpool(
            parse_and_store,
            source=result["source"],
            exam_id=request.exam_id,
            year=request.year,
        )

        return {
            "success":          True,
            "source":           result["source"],
            "pages":            result["pages"],
            "chunks":           result["chunks"],
            "failed":           result["failed"],
            "questions_parsed": parse_result.get("questions_parsed", 0),
            "chapters_mapped":  parse_result.get("chapters_mapped",  0),
        }

    except ValueError as e:
        logger.exception("Validation error during paper ingestion")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        logger.exception("Paper ingestion pipeline failed")
        raise HTTPException(status_code=500, detail="Paper ingestion failed")


# ─────────────────────────────────────────────────────────
#  POST /api/ingest/syllabus — admin syllabus upload
#
#  Reuses the same OCR pipeline (download → images → extract)
#  but skips vector store storage — syllabus text is only
#  used to build the subject→chapter tree in Postgres.
#  Does NOT call run() since we don't need embeddings.
# ─────────────────────────────────────────────────────────

@router.post("/ingest/syllabus")
async def ingest_syllabus(
    request:   SyllabusIngestRequest,
    x_api_key: str = Header(...),
):
    if x_api_key != config.INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    local_pdf_path = None

    try:
        logger.info(f"[Syllabus] Starting ingest for exam_id={request.exam_id}")

        # 1. Download PDF — reuse ingest_service helper
        local_pdf_path = await run_in_threadpool(
            download_pdf,
            str(request.pdf_url),
        )

        # 2. PDF → images — reuse ingest_service helper
        images = await run_in_threadpool(load_pdf_images, local_pdf_path)

        # 3. OCR — reuse ingest_service helper
        pages = await run_in_threadpool(extract_pages, images)

        # 4. Concatenate all pages into one text block
        # Syllabus is 1-3 pages so this is always small
        ocr_text = "\n\n".join(
            pages[p] for p in sorted(pages.keys())
        )

        logger.info(f"[Syllabus] OCR complete — {len(pages)} pages, {len(ocr_text)} chars")

        # 5. Parse syllabus structure → Postgres
        # Creates subjects + chapters with is_syllabus_defined=TRUE
        result = await run_in_threadpool(
            parse_and_store_syllabus,
            ocr_text=ocr_text,
            exam_id=request.exam_id,
        )

        logger.info(
            f"[Syllabus] Done — {result['subjects_created']} subjects, "
            f"{result['chapters_created']} chapters"
        )

        return {
            "success":          True,
            "subjects_created": result["subjects_created"],
            "chapters_created": result["chapters_created"],
            "syllabus_tree":    result["syllabus_tree"],
        }

    except ValueError as e:
        logger.exception("Validation error during syllabus ingestion")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        logger.exception("Syllabus ingestion failed")
        raise HTTPException(status_code=500, detail="Syllabus ingestion failed")
    finally:
        cleanup_temp_file(local_pdf_path)