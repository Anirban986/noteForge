from fastapi import APIRouter, HTTPException, Header

from fastapi.concurrency import run_in_threadpool

from pydantic import BaseModel, HttpUrl

import logging
import config

from services.ingest_service import run

router = APIRouter()

logger = logging.getLogger(__name__)


class IngestRequest(BaseModel):

    pdf_url: HttpUrl
    source: str | None = None
    


@router.post("/ingest")
async def ingest(request: IngestRequest, x_api_key: str = Header(...)):

    if x_api_key != config.INTERNAL_API_KEY:

        raise HTTPException(status_code=401, detail="Unauthorized")

    try:

        result = await run_in_threadpool(
            run,
            pdf_url=request.pdf_url,
            source=request.source
            
            # batch_size=config.BATCH_SIZE
        )

        return {
            "success": True,
            "source": result["source"],
            "pages": result["pages"],
            "chunks": result["chunks"],
            "failed": result["failed"],
        }

    except ValueError as e:

        logger.exception("Validation error during ingestion")

        raise HTTPException(status_code=422, detail=str(e))

    except Exception:

        logger.exception("Ingestion pipeline failed")

        raise HTTPException(status_code=500, detail="Ingestion failed")
