"""
api/routes/ingest.py
--------------------
POST /ingest

Receives S3 PDF URL
and runs ingestion pipeline.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, HttpUrl

from services.ingest_service import run
import config

router = APIRouter()


# ──────────────────────────────────────────────────────────
# Request Schema
# ──────────────────────────────────────────────────────────

class IngestRequest(BaseModel):

    pdf_url: HttpUrl


# ──────────────────────────────────────────────────────────
# Route
# ──────────────────────────────────────────────────────────

@router.post("/ingest")
async def ingest(

    request: IngestRequest,

    batch_size: int = Query(
        default=config.BATCH_SIZE,
        ge=1,
        le=5,
        description=(
            "Pages per OCR batch."
        )
    )
):
    """
    Ingest PDF from S3 URL.

    Flow:
        S3 URL
            ↓
        temporary download
            ↓
        OCR
            ↓
        chunking
            ↓
        embeddings
            ↓
        ChromaDB
    """

    try:

        result = run(
            pdf_url=str(request.pdf_url),
            batch_size=batch_size
        )

        return {

            "message":
                "PDF ingested successfully.",

            "source":
                result["source"],

            "pages":
                result["pages"],

            "chunks":
                result["chunks"],

            "failed":
                result["failed"],

            "batch_size":
                batch_size
        }

    except ValueError as e:

        raise HTTPException(
            status_code=422,
            detail=str(e)
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Ingestion failed: {str(e)}"
        )