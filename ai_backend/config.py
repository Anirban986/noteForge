"""
config.py — central configuration
All settings in one place. Secrets come from .env file.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Gemini (raw SDK — used only for Vision) ──────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL   = "gemini-2.5-flash"
GOOGLE_APPLICATION_CREDENTIALS=os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
# ── OCR quality thresholds ───────────────────────────────
# Pages passing both checks use Cloud Vision text (no Gemini quota).
# Pages failing either check fall back to Gemini Vision.
OCR_MIN_CHARS      = 80    # min characters for a page to be considered good
OCR_MIN_WORD_RATIO = 0.5   # min ratio of real words (alpha chars, length >= 2)

# ── Vision batching ──────────────────────────────────────
BATCH_SIZE          = 2      # pages sent to Gemini Vision per request
BATCH_DELAY_SECONDS = 4      # wait between batches to respect rate limits
MAX_RETRIES         = 3      # retry attempts per batch on failure
RETRY_DELAY_SECONDS = 10     # wait between retries

# ── Embeddings (local, free) ─────────────────────────────
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"

# ── ChromaDB ─────────────────────────────────────────────
CHROMA_DB_PATH  = "./chroma_db"
COLLECTION_NAME = "notes"

# ── LangChain chunking ───────────────────────────────────
CHUNK_SIZE    = 500   # characters
CHUNK_OVERLAP = 50

# ── Retrieval ────────────────────────────────────────────
TOP_K = 4

# ── PDF rasterization ────────────────────────────────────
PDF_DPI = 250

# Path to poppler's bin folder (Windows only).
# Download from: https://github.com/oschwartz10612/poppler-windows/releases/latest
# Extract it and set the path to the Library\bin folder below.
# Set to None on Mac/Linux (poppler installed via brew/apt is found automatically).
POPPLER_PATH = r"C:\Release-25.12.0-0\poppler-25.12.0\Library\bin"   # ← update this to your actual path