"""
api/routes/ingest.py
--------------------
POST /ingest — upload a PDF and run the batched ingestion pipeline
"""

import os
import tempfile

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from services.ingest_service import run
import config

router = APIRouter()


@router.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    batch_size: int = Query(
        default=config.BATCH_SIZE,
        ge=1,
        le=5,
        description="Pages per Gemini Vision request (1-5). Lower = safer for rate limits."
    )
):
    """
    Upload a scanned handwritten PDF.

    Pages are sent to Gemini Vision in small batches (default: 2 pages per request)
    to avoid token exhaustion and respect the free-tier rate limit.

    - batch_size=1 : safest, slowest (one page per request)
    - batch_size=2 : default, good balance
    - batch_size=5 : fastest, higher chance of hitting rate limits
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files are accepted.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        result = run(tmp_path, batch_size=batch_size)
        return {
            "message":    f"Ingested '{file.filename}' successfully.",
            "pages":      result["pages"],
            "chunks":     result["chunks"],
            "failed":     result["failed"],
            "batch_size": batch_size
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        os.unlink(tmp_path)