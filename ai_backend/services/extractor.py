"""
services/extractor.py
---------------------
Hybrid text extraction pipeline:

  1. Google Cloud Vision API  — OCR every page (free tier: 1000 pages/month)
  2. Quality checker          — score the extracted text
  3. Gemini Vision (fallback) — only for pages where Vision OCR failed/garbage

This preserves Gemini API quota for note generation and other modules.

Quality scoring:
  A page's OCR is considered "good" if:
    - It has at least MIN_CHARS characters
    - At least MIN_WORD_RATIO of tokens look like real words (alpha, len >= 2)
  If either condition fails → page is sent to Gemini as fallback.

Setup:
  1. Enable Cloud Vision API at console.cloud.google.com
  2. Create a service account key → download JSON
  3. Set GOOGLE_APPLICATION_CREDENTIALS in your .env file:
       GOOGLE_APPLICATION_CREDENTIALS=C:\\path\\to\\key.json
"""

import io
import time
import re
import google.genai as genai
import config
from google.oauth2 import service_account
from google.cloud import vision

# ── Clients ───────────────────────────────────────────────
_gemini = genai.Client(api_key=config.GEMINI_API_KEY)
credentials = service_account.Credentials.from_service_account_file(
    config.GOOGLE_APPLICATION_CREDENTIALS
)

_vision = vision.ImageAnnotatorClient(credentials=credentials)


# ── Quality thresholds (tunable in config.py) ─────────────
MIN_CHARS = getattr(config, "OCR_MIN_CHARS", 80)  # min chars for "good" page
MIN_WORD_RATIO = getattr(config, "OCR_MIN_WORD_RATIO", 0.5)  # min ratio of real words


# ─────────────────────────────────────────────────────────
#  GOOGLE CLOUD VISION OCR
# ─────────────────────────────────────────────────────────


def _pil_to_bytes(image) -> bytes:
    """Convert a PIL Image to PNG bytes for the Vision API."""
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def _vision_ocr_page(image, page_num: int) -> str:
    """
    Send a single page image to Google Cloud Vision OCR.

    Returns:
        Extracted text string, or "" on failure.
    """
    try:
        img_bytes = _pil_to_bytes(image)
        vision_img = vision.Image(content=img_bytes)
        response = _vision.document_text_detection(image=vision_img)

        if response.error.message:
            print(f"  [vision] Page {page_num} error: {response.error.message}")
            return ""

        return response.full_text_annotation.text or ""

    except Exception as e:
        print(f"  [vision] Page {page_num} failed: {e}")
        return ""


# ─────────────────────────────────────────────────────────
#  QUALITY CHECKER
# ─────────────────────────────────────────────────────────


def _is_good_quality(text: str) -> bool:
    """
    Decide if OCR text is good enough to use directly.

    A page fails quality check if:
      - Text is too short (likely blank or scan failed)
      - Too many tokens are non-word garbage (symbols, single chars)

    Args:
        text: raw OCR output for one page

    Returns:
        True  → use this text, skip Gemini
        False → send page to Gemini Vision as fallback
    """
    if not text or len(text.strip()) < MIN_CHARS:
        return False

    tokens = text.split()
    real_words = [t for t in tokens if len(t) >= 2 and re.search(r"[a-zA-Z0-9]", t)]
    ratio = len(real_words) / len(tokens) if tokens else 0

    return ratio >= MIN_WORD_RATIO


# ─────────────────────────────────────────────────────────
#  GEMINI VISION FALLBACK
# ─────────────────────────────────────────────────────────

_GEMINI_PROMPT = """This is a scanned page of handwritten academic notes.
Extract ALL text content from the image.
Ignore crossed-out or scribbled text.
Infer unclear words from academic/technical context.
Preserve structure: headings, tables, bullet points, numbered lists.
If a diagram is present, describe it concisely.
Output only the extracted content — no commentary."""


def _gemini_ocr_page(image, page_num: int) -> str:
    """
    Send a single page to Gemini Vision as fallback.
    Only called when Cloud Vision quality check fails.

    Uses 1 Gemini API request per page — used sparingly.
    """
    print(
        f"  [gemini-fallback] Page {page_num} — sending to Gemini Vision...",
        end=" ",
        flush=True,
    )

    for attempt in range(1, config.MAX_RETRIES + 1):
        try:
            response = _gemini.models.generate_content(
                model=config.GEMINI_MODEL, contents=[image, _GEMINI_PROMPT]
            )
            print("done")
            return response.text.strip()

        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                # Rate limit hit — extract retry delay if available
                wait = config.RETRY_DELAY_SECONDS
                try:
                    import re as _re

                    match = _re.search(r"retry.*?(\d+)s", err_str, _re.IGNORECASE)
                    if match:
                        wait = int(match.group(1)) + 2
                except Exception:
                    pass
                print(f"\n  [gemini-fallback] Rate limit. Waiting {wait}s...")
                time.sleep(wait)
            elif attempt < config.MAX_RETRIES:
                print(
                    f"\n  [gemini-fallback] Attempt {attempt} failed: {e}. Retrying..."
                )
                time.sleep(config.RETRY_DELAY_SECONDS)
            else:
                print(
                    f"\n  [gemini-fallback] All attempts failed for page {page_num}: {e}"
                )
                return ""

    return ""


# ─────────────────────────────────────────────────────────
#  MAIN EXTRACTION PIPELINE
# ─────────────────────────────────────────────────────────


def extract_all(images: list, batches: list = None) -> dict[int, str]:
    """
    Extract text from all pages using the hybrid pipeline.

    For every page:
      1. Try Google Cloud Vision OCR (free, fast, no Gemini quota)
      2. If quality check passes → use Vision text directly
      3. If quality check fails  → fallback to Gemini Vision

    Args:
        images:  list of PIL Images (one per page)
        batches: ignored — kept for API compatibility with ingest_service.py

    Returns:
        dict of page_number → extracted text string
    """
    total = len(images)
    all_pages = {}

    vision_ok = 0
    gemini_fallback = 0
    failed = 0

    print(f"\n[extractor] Hybrid extraction: {total} page(s)")
    print(f"[extractor] Strategy: Cloud Vision → quality check → Gemini fallback\n")

    for page_num, image in enumerate(images, start=1):

        try:

            print(f"[extractor] Page {page_num}/{total}", end=" — ", flush=True)

            # ── Step 1: Cloud Vision OCR ──────────────────
            print("Cloud Vision...", end=" ", flush=True)

            ocr_text = _vision_ocr_page(image, page_num)

            # ── Step 2: Quality check ─────────────────────
            if _is_good_quality(ocr_text):

                print(f"OK ({len(ocr_text)} chars)")

                all_pages[page_num] = ocr_text

                vision_ok += 1

            else:

                # ── Step 3: Gemini fallback ───────────────
                char_count = len(ocr_text.strip())

                print(f"low quality ({char_count} chars) " f"→ Gemini fallback")

                gemini_text = _gemini_ocr_page(image, page_num)

                if gemini_text:

                    all_pages[page_num] = gemini_text

                    gemini_fallback += 1

                else:

                    # Use partial Vision OCR if available
                    if ocr_text.strip():

                        print(
                            f"  [extractor] "
                            f"Using partial Vision text "
                            f"for page {page_num}"
                        )

                        all_pages[page_num] = ocr_text

                        vision_ok += 1

                    else:

                        print(f"  [extractor] " f"Page {page_num} failed entirely")

                        failed += 1

            # Small API pacing delay
            if page_num < total:
                time.sleep(0.3)

        finally:

            # ── IMPORTANT: free PIL image memory ──────────
            try:
                image.close()
            except Exception:
                pass
    # ── Summary ───────────────────────────────────────────
    print(f"\n[extractor] Complete: {total} page(s) processed")
    print(f"  Cloud Vision (good quality) : {vision_ok}")
    print(f"  Gemini fallback             : {gemini_fallback}")
    print(f"  Failed (skipped)            : {failed}")
    if gemini_fallback > 0:
        print(f"  Gemini API requests used    : {gemini_fallback} of your daily quota")

    return all_pages
