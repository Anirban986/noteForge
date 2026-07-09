"""
services/ingest_service.py
--------------------------
Production-ready ingestion pipeline.

Changes from original:
  - run() accepts two new optional params:
      source_type    str  "notes" | "question_paper"  (default "notes")
      extra_metadata dict  passed through to vector store for chunk tagging

Everything else (download, pdf→images, OCR, cleanup) is completely unchanged.
"""

from pathlib import Path

import tempfile
import requests
import logging
import os
import gc

from utils    import pdf_loader
from services import extractor, vector_store

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 50 * 1024 * 1024


# ─────────────────────────────────────────────────────────
#  Download PDF — unchanged
# ─────────────────────────────────────────────────────────

def download_pdf(pdf_url: str) -> str:
    logger.info(f"Downloading PDF from: {pdf_url[:80]}...")
    
    response = requests.get(pdf_url, stream=True, timeout=120)
    response.raise_for_status()
    
    content_length = response.headers.get("Content-Length", "unknown")
    content_type   = response.headers.get("Content-Type", "unknown")
    logger.info(f"Content-Length: {content_length}, Content-Type: {content_type}")
    
    # Check content type
    if "pdf" not in content_type.lower() and content_length != "unknown":
        logger.warning(f"Unexpected content type: {content_type}")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        total_bytes = 0
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                temp_file.write(chunk)
                total_bytes += len(chunk)
        
        logger.info(f"Downloaded {total_bytes} bytes to {temp_file.name}")
        
        # Fail fast if empty
        if total_bytes == 0:
            raise ValueError(f"Downloaded PDF is empty (0 bytes). URL may be expired or invalid.")
        
        return temp_file.name


# ─────────────────────────────────────────────────────────
#  Load PDF images — unchanged
# ─────────────────────────────────────────────────────────

def load_pdf_images(local_pdf_path: str):
    logger.info("Converting PDF to images")
    images = pdf_loader.load(local_pdf_path)
    logger.info(f"Loaded {len(images)} page(s)")
    return images


# ─────────────────────────────────────────────────────────
#  OCR extraction — unchanged
# ─────────────────────────────────────────────────────────

def extract_pages(images):
    logger.info("Starting OCR extraction")
    pages = extractor.extract_all(images)
    if not pages:
        raise ValueError("No text extracted from PDF")
    logger.info(f"Successfully extracted {len(pages)} page(s)")
    return pages


# ─────────────────────────────────────────────────────────
#  Vector storage — now accepts source_type + extra_metadata
# ─────────────────────────────────────────────────────────

def store_embeddings(
    pages,
    source:        str,
    source_type:   str  = "notes",
    extra_metadata: dict = None,
):
    logger.info(f"Creating embeddings (source_type={source_type})")
    num_chunks = vector_store.store_embeddings(
        pages=pages,
        source=source,
        source_type=source_type,
        extra_metadata=extra_metadata or {},
    )
    logger.info(f"{num_chunks} chunks indexed")
    return num_chunks


# ─────────────────────────────────────────────────────────
#  Cleanup — unchanged
# ─────────────────────────────────────────────────────────

def cleanup_temp_file(local_pdf_path: str | None):
    if local_pdf_path and os.path.exists(local_pdf_path):
        try:
            os.remove(local_pdf_path)
            logger.info("Temporary PDF deleted")
        except Exception:
            logger.exception("Failed to cleanup temp PDF")


# ─────────────────────────────────────────────────────────
#  Main pipeline
#  New params:
#    source_type    — "notes" (default) | "question_paper"
#    extra_metadata — dict of additional fields for chunk metadata
#                     e.g. {"exam_id": "...", "year": 2024}
# ─────────────────────────────────────────────────────────

def run(
    pdf_url:        str,
    source:         str  | None = None,
    source_type:    str          = "notes",
    extra_metadata: dict | None  = None,
) -> dict:
    """
    Run ingestion pipeline.

    Flow:
        download
            ↓
        PDF → images
            ↓
        OCR
            ↓
        embeddings (tagged with source_type + extra_metadata)
            ↓
        vector storage
            ↓
        cleanup
    """
    local_pdf_path = None

    try:
        logger.info("=" * 50)
        logger.info(f"INGESTION STARTED  source_type={source_type}")
        logger.info("=" * 50)

        local_pdf_path = download_pdf(pdf_url)

        if not source:
            source = Path(local_pdf_path).stem

        images      = load_pdf_images(local_pdf_path)
        total_pages = len(images)
        pages       = extract_pages(images)
        failed_pages = total_pages - len(pages)

        del images
        gc.collect()

        num_chunks = store_embeddings(
            pages=pages,
            source=source,
            source_type=source_type,
            extra_metadata=extra_metadata or {},
        )

        logger.info("=" * 50)
        logger.info("INGESTION COMPLETE")
        logger.info("=" * 50)

        return {
            "source": source,
            "pages":  len(pages),
            "chunks": num_chunks,
            "failed": failed_pages,
        }

    except Exception:
        logger.exception("Ingestion pipeline failed")
        raise

    finally:
        cleanup_temp_file(local_pdf_path)