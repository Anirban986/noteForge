"""
api/app.py
-----------

Production-ready FastAPI entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import (
    ingest,
    query,
    notes,
    manage
)

import config


# ─────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────

app = FastAPI(
    title="NoteForge AI API",
    version="2.0.0",
    description=(
        "AI-powered handwritten notes processing system.\n\n"
        "Features:\n"
        "- OCR extraction\n"
        "- Gemini fallback OCR\n"
        "- RAG retrieval\n"
        "- AI-generated notes\n"
        "- Vector search"
    )
)


# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    config.FRONTEND_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin
        for origin in ALLOWED_ORIGINS
        if origin
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "service": "fastapi",
        "version": "2.0.0"
    }


# ─────────────────────────────────────────────
# API Routers
# ─────────────────────────────────────────────

app.include_router(
    ingest.router,
    prefix="/api",
    tags=["Ingestion"]
)

app.include_router(
    query.router,
    prefix="/api",
    tags=["Query"]
)

app.include_router(
    notes.router,
    prefix="/api",
    tags=["Notes"]
)

app.include_router(
    manage.router,
    prefix="/api",
    tags=["Management"]
)