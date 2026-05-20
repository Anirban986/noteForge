"""
utils/pdf_loader.py
-------------------

Memory-efficient scalable PDF loader.

Why this version?
- Loads ONE page at a time
- Prevents RAM explosion on large PDFs
- Better for Render/Railway deployments
- Works with OCR pipelines efficiently
- Supports very large PDFs safely

Architecture:
    PDF
      ↓
    iter_pages()
      ↓
    yield single PIL image
      ↓
    OCR immediately
      ↓
    free memory
"""

from pathlib import Path
from typing import Generator, Tuple
from typing import List
from pdf2image import (
    convert_from_path,
    pdfinfo_from_path
)

import config


# ─────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────

def _validate_pdf(pdf_path: str) -> Path:

    path = Path(pdf_path)

    if not path.exists():

        raise FileNotFoundError(
            f"PDF not found: {pdf_path}"
        )

    if path.suffix.lower() != ".pdf":

        raise ValueError(
            f"Expected PDF file, got: {path.suffix}"
        )

    return path


# ─────────────────────────────────────────────
# Get total pages
# ─────────────────────────────────────────────

def get_total_pages(pdf_path: str) -> int:

    path = _validate_pdf(pdf_path)

    info = pdfinfo_from_path(
        str(path),
        poppler_path=config.POPPLER_PATH
    )

    return info["Pages"]


# ─────────────────────────────────────────────
# Stream pages one-by-one
# ─────────────────────────────────────────────

def iter_pages(
    pdf_path: str
) -> Generator[Tuple[int, object], None, None]:
    """
    Yield one PDF page at a time as PIL Image.

    Args:
        pdf_path:
            Local PDF path

    Yields:
        tuple:
            (
                page_number,
                PIL.Image
            )

    Benefits:
    - Only ONE page in RAM
    - Much safer for cloud deployment
    - Better scalability
    """

    path = _validate_pdf(pdf_path)

    total_pages = get_total_pages(str(path))

    print(
        f"[pdf_loader] "
        f"Streaming {total_pages} page(s) "
        f"from '{path.name}' "
        f"at {config.PDF_DPI} DPI"
    )

    for page_num in range(1, total_pages + 1):

        print(
            f"[pdf_loader] "
            f"Loading page "
            f"{page_num}/{total_pages}"
        )

        pages = convert_from_path(

            str(path),

            dpi=config.PDF_DPI,

            first_page=page_num,

            last_page=page_num,

            poppler_path=config.POPPLER_PATH
        )

        if not pages:

            print(
                f"[pdf_loader] "
                f"Skipping page {page_num}"
            )

            continue

        yield page_num, pages[0]


# ─────────────────────────────────────────
# BACKWARD COMPATIBILITY WRAPPER
# ─────────────────────────────────────────
def load(pdf_path: str) -> List[object]:
    """
    Compatibility layer for old ingestion code.
    """
    return [img for _, img in iter_pages(pdf_path)]

# ─────────────────────────────────────────────
# Optional page limit protection
# ─────────────────────────────────────────────

def validate_page_limit(
    pdf_path: str,
    max_pages: int = 100
):
    """
    Prevent huge PDFs from crashing server.
    """

    total_pages = get_total_pages(pdf_path)

    if total_pages > max_pages:

        raise ValueError(
            f"PDF exceeds limit of "
            f"{max_pages} pages."
        )

    return total_pages