"""
config.py — central configuration
All settings in one place.
Supports both:
1. Local development using services-account.json
2. Deployment using GOOGLE_SERVICE_ACCOUNT_JSON env variable
"""

import os
import json
from dotenv import load_dotenv

# Load .env file locally
load_dotenv()

# ── Gemini ───────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"

# ── Google Service Account (Hybrid Setup) ───────────────
# Deployment:
#   Uses GOOGLE_SERVICE_ACCOUNT_JSON environment variable
#
# Local:
#   Uses services-account.json file

GOOGLE_SERVICE_ACCOUNT_JSON = os.getenv(
    "GOOGLE_SERVICE_ACCOUNT_JSON"
)

GOOGLE_SERVICE_ACCOUNT_INFO = None

# If env variable exists → deployment mode
if GOOGLE_SERVICE_ACCOUNT_JSON:
    GOOGLE_SERVICE_ACCOUNT_INFO = json.loads(
        GOOGLE_SERVICE_ACCOUNT_JSON
    )

    # Fix multiline private key issue
    GOOGLE_SERVICE_ACCOUNT_INFO["private_key"] = (
        GOOGLE_SERVICE_ACCOUNT_INFO["private_key"]
        .replace("\\n", "\n")
    )

# Local JSON file path
GOOGLE_SERVICE_ACCOUNT_FILE = "services-account.json"

# ── OCR quality thresholds ───────────────────────────────
OCR_MIN_CHARS = 80
OCR_MIN_WORD_RATIO = 0.5

# ── Vision batching ──────────────────────────────────────
BATCH_SIZE = 2
BATCH_DELAY_SECONDS = 4
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 10

# ── Embeddings (local, free) ─────────────────────────────
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"

# ── ChromaDB ─────────────────────────────────────────────
CHROMA_DB_PATH = "./chroma_db"
COLLECTION_NAME = "notes"

# ── LangChain chunking ───────────────────────────────────
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# ── Retrieval ────────────────────────────────────────────
TOP_K = 4

# ── PDF rasterization ────────────────────────────────────
PDF_DPI = 250

# ── Poppler ──────────────────────────────────────────────
# Windows local development
# Linux deployment uses system-installed poppler

POPPLER_PATH = (
    None
    if os.getenv("RENDER")
    else r"C:\Release-25.12.0-0\poppler-25.12.0\Library\bin"
)

#frontend url
FRONTEND_URL="http://noteforge-five.vercel.app"

BACKEND_URL="https://noteforge-1-npjc.onrender.com"

INTERNAL_API_KEY=os.getenv("AI_API_KEY")