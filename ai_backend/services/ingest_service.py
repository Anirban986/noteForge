"""
services/ingest_service.py
--------------------------

Production-ready ingestion pipeline.

Flow:
    S3 PDF URL
        ↓
    temporary download
        ↓
    PDF → images
        ↓
    OCR extraction
        ↓
    chunking + embeddings
        ↓
    ChromaDB storage
        ↓
    cleanup

This version:
- Removes local markdown file storage
- Reduces disk usage
- Better for cloud deployment
- Cleans up memory aggressively
"""

from pathlib import Path
import tempfile
import requests
import os
import gc

from utils import pdf_loader
from services import extractor, vector_store


# ──────────────────────────────────────────────────────────
# S3 Downloader
# ──────────────────────────────────────────────────────────

def download_pdf(pdf_url: str) -> str:
    """
    Download PDF from S3 URL to a temporary file.

    Args:
        pdf_url:
            Public or presigned S3 URL

    Returns:
        Local temporary PDF path
    """

    print("[ingest_service] Downloading PDF from S3...")

    response = requests.get(
        pdf_url,
        timeout=120
    )

    response.raise_for_status()

    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    )

    temp_file.write(response.content)

    temp_file.close()

    print(
        f"[ingest_service] "
        f"Download complete: {temp_file.name}"
    )

    return temp_file.name


# ──────────────────────────────────────────────────────────
# Main Pipeline
# ──────────────────────────────────────────────────────────

def run(
    pdf_url: str,
    batch_size: int = None
) -> dict:
    """
    Run full ingestion pipeline.

    Args:
        pdf_url:
            S3 PDF URL

        batch_size:
            Reserved for future batching support

    Returns:
        Ingestion metadata
    """

    local_pdf_path = None

    try:

        # ─────────────────────────────────────────────
        # Download PDF from S3
        # ─────────────────────────────────────────────

        local_pdf_path = download_pdf(pdf_url)

        source = Path(local_pdf_path).stem

        print(f"\n{'=' * 52}")
        print("  INGESTING PDF")
        print(f"{'=' * 52}")

        # ─────────────────────────────────────────────
        # PDF → Images
        # ─────────────────────────────────────────────

        images = pdf_loader.load(local_pdf_path)

        total_pages = len(images)

        print(
            f"[ingest_service] "
            f"Loaded {total_pages} page(s)"
        )

        # ─────────────────────────────────────────────
        # OCR Extraction
        # ─────────────────────────────────────────────

        pages = extractor.extract_all(images)

        # Free image memory aggressively
        del images
        gc.collect()

        if not pages:

            raise ValueError(
                "No text extracted from PDF."
            )

        failed = total_pages - len(pages)

        print(
            f"[ingest_service] "
            f"Successfully extracted "
            f"{len(pages)} page(s)"
        )

        # ─────────────────────────────────────────────
        # Vector Storage
        # ─────────────────────────────────────────────

        num_chunks = vector_store.store(
            pages=pages,
            source=source
        )

        print(
            f"[ingest_service] "
            f"{num_chunks} chunks indexed"
        )

        print(f"\n{'=' * 52}")
        print("  INGESTION COMPLETE")
        print(f"{'=' * 52}\n")

        return {
            "source": source,
            "pages": len(pages),
            "chunks": num_chunks,
            "failed": failed
        }

    except Exception as e:

        print(
            f"[ingest_service] ERROR: {str(e)}"
        )

        raise

    finally:

        # ─────────────────────────────────────────────
        # Cleanup temporary PDF
        # ─────────────────────────────────────────────

        if (
            local_pdf_path
            and os.path.exists(local_pdf_path)
        ):

            try:

                os.remove(local_pdf_path)

                print(
                    "[ingest_service] "
                    "Temporary PDF deleted."
                )

            except Exception as cleanup_error:

                print(
                    f"[ingest_service] "
                    f"Cleanup failed: "
                    f"{cleanup_error}"
                )