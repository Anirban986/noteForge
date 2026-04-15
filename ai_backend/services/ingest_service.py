"""
services/ingest_service.py
--------------------------
Orchestrates the full ingestion pipeline.
Called by both the API route and the CLI.

Flow:
    PDF
     ↓ pdf_loader.load()
    PIL images (all pages)
     ↓ extractor.extract_all()     ← Cloud Vision first, Gemini only as fallback
    pages dict {page_num: text}
     ↓ notes_saver.save()
    .md file saved to disk
     ↓ vector_store.store()        ← LangChain: split → embed → ChromaDB
    chunks indexed
"""

from pathlib import Path
from utils import pdf_loader, notes_saver
from services import extractor, vector_store


def run(pdf_path: str, batch_size: int = None) -> dict:
    """
    Run the full ingestion pipeline for a scanned PDF.

    Args:
        pdf_path:   path to the PDF file
        batch_size: ignored (kept for CLI/API compatibility).
                    The hybrid extractor processes pages individually.

    Returns:
        dict with keys:
            source     — PDF name without extension
            pages      — number of pages successfully extracted
            chunks     — number of chunks stored in ChromaDB
            notes_path — path to the saved .md file
            failed     — number of pages that failed extraction
    """
    source = Path(pdf_path).stem

    print(f"\n{'='*52}")
    print(f"  INGESTING: {Path(pdf_path).name}")
    print(f"{'='*52}")

    # 1. PDF → PIL images
    images = pdf_loader.load(pdf_path)

    # 2. Hybrid extraction: Cloud Vision → quality check → Gemini fallback
    pages = extractor.extract_all(images)

    if not pages:
        raise ValueError("No text extracted. Check PDF quality and your API credentials.")

    failed = len(images) - len(pages)

    # 3. Save full extracted text to .md file
    notes_path = notes_saver.save(pages, pdf_path)

    # 4. LangChain: split → embed → store in ChromaDB
    num_chunks = vector_store.store(pages, source=source)

    print(f"\n{'='*52}")
    print(f"  Ingestion complete")
    print(f"  Pages extracted : {len(pages)}/{len(images)}")
    print(f"  Pages failed    : {failed}")
    print(f"  Chunks indexed  : {num_chunks}")
    print(f"  Notes saved     : {notes_path}")
    print(f"{'='*52}\n")

    return {
        "source":     source,
        "pages":      len(pages),
        "chunks":     num_chunks,
        "notes_path": notes_path,
        "failed":     failed
    }