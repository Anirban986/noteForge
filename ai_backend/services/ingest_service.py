"""
services/ingest_service.py
--------------------------

Production-ready ingestion pipeline.

Features:
- Streaming S3 download
- Temporary file cleanup
- Memory cleanup
- Logging
- Validation
- Better error handling
- Scalable structure
"""

from pathlib import Path

import tempfile
import requests
import logging
import os
import gc

from utils import pdf_loader
from services import extractor, vector_store

# ──────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────

MAX_FILE_SIZE = 50 * 1024 * 1024


# ──────────────────────────────────────────────────────────
# Download PDF
# ──────────────────────────────────────────────────────────


def download_pdf(pdf_url: str) -> str:
    """
    Download PDF from S3 URL
    using streaming.

    Returns:
        Temporary local PDF path
    """

    logger.info("Downloading PDF from S3")

    response = requests.get(pdf_url, stream=True, timeout=120)

    response.raise_for_status()

    # ─────────────────────────────────────
    # Validate content type
    # ─────────────────────────────────────

    content_type = response.headers.get("Content-Type", "")

    if "pdf" not in content_type.lower():

        raise ValueError("Invalid PDF file")

    # ─────────────────────────────────────
    # Validate file size
    # ─────────────────────────────────────

    content_length = int(response.headers.get("Content-Length", 0))

    if content_length > MAX_FILE_SIZE:

        raise ValueError("PDF exceeds size limit")

    # ─────────────────────────────────────
    # Stream download
    # ─────────────────────────────────────

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:

        for chunk in response.iter_content(chunk_size=8192):

            if chunk:
                temp_file.write(chunk)

        logger.info(f"PDF downloaded: {temp_file.name}")

        return temp_file.name


# ──────────────────────────────────────────────────────────
# Load PDF Images
# ──────────────────────────────────────────────────────────


def load_pdf_images(local_pdf_path: str):
    """
    Convert PDF into images.
    """

    logger.info("Converting PDF to images")

    images = pdf_loader.load(local_pdf_path)

    logger.info(f"Loaded {len(images)} page(s)")

    return images


# ──────────────────────────────────────────────────────────
# OCR Extraction
# ──────────────────────────────────────────────────────────


def extract_pages(images):
    """
    Extract text from images.
    """

    logger.info("Starting OCR extraction")

    pages = extractor.extract_all(images)

    if not pages:

        raise ValueError("No text extracted from PDF")

    logger.info(f"Successfully extracted " f"{len(pages)} page(s)")

    return pages


# ──────────────────────────────────────────────────────────
# Vector Storage
# ──────────────────────────────────────────────────────────


def store_embeddings(pages, source):
    """
    Store embeddings in vector DB.
    """

    logger.info("Creating embeddings")

    num_chunks = vector_store.store_embeddings(
        pages=pages,
        source=source,
       
    )

    logger.info(f"{num_chunks} chunks indexed")

    return num_chunks


# ──────────────────────────────────────────────────────────
# Cleanup
# ──────────────────────────────────────────────────────────


def cleanup_temp_file(local_pdf_path: str | None):
    """
    Cleanup temporary PDF.
    """

    if local_pdf_path and os.path.exists(local_pdf_path):

        try:

            os.remove(local_pdf_path)

            logger.info("Temporary PDF deleted")

        except Exception:

            logger.exception("Failed to cleanup temp PDF")


# ──────────────────────────────────────────────────────────
# Main Pipeline
# ──────────────────────────────────────────────────────────


def run(pdf_url: str, source: str | None = None) -> dict:
    """
    Run ingestion pipeline.

    Flow:
        download
            ↓
        PDF → images
            ↓
        OCR
            ↓
        embeddings
            ↓
        vector storage
            ↓
        cleanup
    """

    local_pdf_path = None

    try:

        logger.info("=" * 50)
        logger.info("INGESTION STARTED")
        logger.info("=" * 50)

        # ─────────────────────────────────────
        # Download PDF
        # ─────────────────────────────────────

        local_pdf_path = download_pdf(pdf_url)

        # ─────────────────────────────────────
        # Source tracking
        # ─────────────────────────────────────

        if not source:

            source = Path(local_pdf_path).stem

        # ─────────────────────────────────────
        # PDF → Images
        # ─────────────────────────────────────

        images = load_pdf_images(local_pdf_path)

        total_pages = len(images)

        # ─────────────────────────────────────
        # OCR Extraction
        # ─────────────────────────────────────

        pages = extract_pages(images)

        failed_pages = total_pages - len(pages)

        # ─────────────────────────────────────
        # Free image memory
        # ─────────────────────────────────────

        del images

        gc.collect()

        # ─────────────────────────────────────
        # Store Embeddings
        # ─────────────────────────────────────

        num_chunks = store_embeddings(pages=pages, source=source)

        logger.info("=" * 50)
        logger.info("INGESTION COMPLETE")
        logger.info("=" * 50)

        return {
            "source": source,
            "pages": len(pages),
            "chunks": num_chunks,
            "failed": failed_pages,
        }

    except Exception:

        logger.exception("Ingestion pipeline failed")

        raise

    finally:

        cleanup_temp_file(local_pdf_path)
