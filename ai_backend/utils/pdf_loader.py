"""
utils/pdf_loader.py
-------------------
Loads a PDF and returns pages as PIL images.
Also provides batching utility used by the extractor.

Windows note:
    poppler must be downloaded and extracted manually.
    Set POPPLER_PATH in config.py to the Library\bin folder.
    Download: https://github.com/oschwartz10612/poppler-windows/releases/latest
"""

from pathlib import Path
from pdf2image import convert_from_path
import config


def load(pdf_path: str) -> list:
    """
    Convert each PDF page to a PIL Image.

    Args:
        pdf_path: path to the PDF file

    Returns:
        list of PIL Image objects, one per page

    Raises:
        FileNotFoundError: if file does not exist
        ValueError: if file is not a PDF
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {pdf_path}")
    if path.suffix.lower() != ".pdf":
        raise ValueError(f"Expected .pdf, got: {path.suffix}")

    print(f"[pdf_loader] Loading '{path.name}' at {config.PDF_DPI} DPI...")
    pages = convert_from_path(
        str(path),
        dpi=config.PDF_DPI,
        poppler_path=config.POPPLER_PATH   # None on Mac/Linux, path on Windows
    )
    print(f"[pdf_loader] {len(pages)} page(s) rasterized")
    return pages


def make_batches(images: list, batch_size: int = config.BATCH_SIZE) -> list[list]:
    """
    Split a list of PIL images into batches.

    Args:
        images:     list of PIL Images
        batch_size: number of pages per batch

    Returns:
        list of batches, each batch is a list of (page_num, image) tuples
        page_num is 1-indexed to match the original PDF page number
    """
    indexed = list(enumerate(images, start=1))
    batches = [
        indexed[i : i + batch_size]
        for i in range(0, len(indexed), batch_size)
    ]
    print(f"[pdf_loader] {len(images)} page(s) split into {len(batches)} batch(es) of {batch_size}")
    return batches