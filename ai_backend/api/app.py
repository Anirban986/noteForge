"""
api/app.py — FastAPI application entry point

Run with:
    uvicorn api.app:app --reload --port 8000

Interactive docs:
    http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import ingest, query, notes, manage

app = FastAPI(
    title="Handwritten Notes RAG API",
    description=(
        "Upload scanned handwritten PDFs and query them using RAG.\n\n"
        "Vision extraction: raw Gemini SDK with batching + rate-limit handling.\n"
        "RAG pipeline: LangChain (chunking, embeddings, ChromaDB, LCEL chains)."
    ),
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict to your frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, tags=["Ingestion"])
app.include_router(query.router,  tags=["Query"])
app.include_router(notes.router,  tags=["Notes"])
app.include_router(manage.router, tags=["Management"])