"""
services/vector_store.py
------------------------

Production-ready scalable vector store.

Architecture:
    OCR Text
        ↓
    Chunking
        ↓
    Gemini Embeddings API
        ↓
    ChromaDB

Changes from original:
  - store_embeddings() now accepts source_type and extra_metadata
  - Internally routes to store_note_chunks() or store_paper_chunks()
  - _build_documents() accepts extra metadata fields
  - query_by_source() added — used by question_parser to fetch
    all chunks for a paper source
  - retrieve() bug fixed — formatted.append was outside the loop
  - retrieve() now accepts a source filter for note-scoped RAG
  - All original functions (count, delete_note_vectors, clear,
    as_retriever) are unchanged
"""

from typing import List
import logging

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

import config

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────
#  Constants — unchanged from original
# ─────────────────────────────────────────────────────────

EMBED_BATCH_SIZE    = 50
MIN_CHUNK_LENGTH    = 30
MIN_RELEVANCE_SCORE = 0.55

# ─────────────────────────────────────────────────────────
#  Text splitter — unchanged
# ─────────────────────────────────────────────────────────

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=config.CHUNK_SIZE,
    chunk_overlap=config.CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
)

# ─────────────────────────────────────────────────────────
#  Gemini embeddings — unchanged
# ─────────────────────────────────────────────────────────

_embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-small-en-v1.5"
)

# ─────────────────────────────────────────────────────────
#  ChromaDB factory — unchanged
# ─────────────────────────────────────────────────────────

def get_db() -> Chroma:
    return Chroma(
        collection_name=config.COLLECTION_NAME,
        embedding_function=_embeddings,
        persist_directory=config.CHROMA_DB_PATH,
    )

# ─────────────────────────────────────────────────────────
#  Helpers — unchanged
# ─────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    return text.replace("\x00", " ").replace("\r", " ").strip()

def _is_valid_chunk(text: str) -> bool:
    if not text:
        return False
    return len(text.strip()) >= MIN_CHUNK_LENGTH

# ─────────────────────────────────────────────────────────
#  _build_documents
#
#  Extended to accept extra_metadata so note chunks and
#  paper chunks can carry different fields in ChromaDB.
#
#  Note chunks carry:    source, page, source_type, note_id
#  Paper chunks carry:   source, page, source_type, exam_id, year
# ─────────────────────────────────────────────────────────

def _build_documents(
    pages:          dict[int, str],
    source:         str,
    extra_metadata: dict = None,
) -> List[Document]:
    extra = extra_metadata or {}
    raw_docs = []

    for page_num, text in sorted(pages.items()):
        cleaned = _clean_text(text)
        if not _is_valid_chunk(cleaned):
            continue

        raw_docs.append(
            Document(
                page_content=cleaned,
                metadata={
                    "source": source,
                    "page":   page_num,
                    **extra,          # source_type + whatever the caller adds
                },
            )
        )

    return raw_docs

# ─────────────────────────────────────────────────────────
#  _embed_and_store — shared batched upsert logic
# ─────────────────────────────────────────────────────────

def _embed_and_store(chunks: list[Document]) -> int:
    db          = get_db()
    total       = len(chunks)

    for i in range(0, total, EMBED_BATCH_SIZE):
        batch = chunks[i : i + EMBED_BATCH_SIZE]
        db.add_documents(batch)
        logger.info(
            f"Embedded batch {i + 1}-{min(i + EMBED_BATCH_SIZE, total)}/{total}"
        )

    logger.info("Embeddings stored successfully")
    return total

# ─────────────────────────────────────────────────────────
#  store_note_chunks
#  Called for user-uploaded notes (source_type = "notes").
#  Metadata: source, page, source_type="notes", note_id
#
#  note_id is passed through extra_metadata when available
#  (uploaded by the Express service after the note doc is created).
# ─────────────────────────────────────────────────────────

def store_note_chunks(
    pages:          dict[int, str],
    source:         str,
    extra_metadata: dict = None,
) -> int:
    extra = {
        "source_type": "notes",
        **(extra_metadata or {}),
    }

    raw_docs = _build_documents(pages, source, extra)

    if not raw_docs:
        raise ValueError("No valid content to store")

    chunks = _splitter.split_documents(raw_docs)
    chunks = [c for c in chunks if _is_valid_chunk(c.page_content)]

    if not chunks:
        raise ValueError("No valid chunks generated")

    logger.info(f"[Notes] {len(chunks)} chunks from source={source}")
    return _embed_and_store(chunks)

# ─────────────────────────────────────────────────────────
#  store_paper_chunks
#  Called for admin question papers (source_type = "question_paper").
#  Metadata: source, page, source_type="question_paper",
#            exam_id, year
#
#  Every chunk is tagged with exam_id so question_parser can
#  retrieve all chunks for a paper using a metadata filter.
# ─────────────────────────────────────────────────────────

def store_paper_chunks(
    pages:          dict[int, str],
    source:         str,
    extra_metadata: dict = None,
) -> int:
    extra = {
        "source_type": "question_paper",
        **(extra_metadata or {}),
    }

    raw_docs = _build_documents(pages, source, extra)

    if not raw_docs:
        raise ValueError("No valid paper content to store")

    chunks = _splitter.split_documents(raw_docs)
    chunks = [c for c in chunks if _is_valid_chunk(c.page_content)]

    if not chunks:
        raise ValueError("No valid paper chunks generated")

    logger.info(
        f"[Paper] {len(chunks)} chunks from source={source} "
        f"exam={extra.get('exam_id')} year={extra.get('year')}"
    )
    return _embed_and_store(chunks)

# ─────────────────────────────────────────────────────────
#  store_embeddings — public router
#
#  Called by ingest_service.store_embeddings().
#  Routes to store_note_chunks or store_paper_chunks based
#  on source_type. Signature is backward-compatible —
#  existing calls without source_type default to "notes".
# ─────────────────────────────────────────────────────────

def store_embeddings(
    pages:          dict[int, str],
    source:         str,
    source_type:    str  = "notes",
    extra_metadata: dict = None,
) -> int:
    if source_type == "question_paper":
        return store_paper_chunks(pages, source, extra_metadata)
    return store_note_chunks(pages, source, extra_metadata)

# ─────────────────────────────────────────────────────────
#  query_by_source
#  NEW — used by question_parser.py to retrieve all text
#  chunks for a specific paper source so Gemini can parse
#  the full text in one call.
#
#  Returns chunks sorted by page number so Gemini sees the
#  paper in reading order.
# ─────────────────────────────────────────────────────────

def query_by_source(
    source:      str,
    source_type: str = "question_paper",
    top_k:       int = 200,
) -> list[dict]:
    if not source:
        return []

    db = get_db()

    # ChromaDB metadata filter: match both source and source_type
    results = db.similarity_search(
        query=source,           # dummy query — we want all chunks for this source
        k=top_k,
        filter={
            "$and": [
                {"source":      {"$eq": source}},
                {"source_type": {"$eq": source_type}},
            ]
        },
    )

    # Sort by page number so Gemini sees the paper in order
    results.sort(key=lambda d: d.metadata.get("page", 0))

    return [
        {
            "text":     doc.page_content,
            "source":   doc.metadata.get("source", ""),
            "page":     doc.metadata.get("page", 0),
            "exam_id":  doc.metadata.get("exam_id", ""),
            "year":     doc.metadata.get("year", ""),
        }
        for doc in results
    ]

# ─────────────────────────────────────────────────────────
#  retrieve
#
#  BUG FIX from original:
#    formatted.append(...) was OUTSIDE the for loop, so only
#    the last doc was ever appended (and used an undefined
#    variable `doc` from the previous iteration).
#    Fixed by moving the append inside the loop.
#
#  Extended with optional source filter:
#    Passing source= restricts retrieval to chunks from that
#    specific note. This prevents exam paper chunks from
#    leaking into note-generation RAG queries. 
# ─────────────────────────────────────────────────────────

def retrieve(
    query:  str,
    top_k:  int  = config.TOP_K,
    source: str  = None,          # pass note source to scope retrieval
) -> list[dict]:
    if not query.strip():
        return []

    db = get_db()

    # Build filter: always restrict to notes, optionally to one source
    chroma_filter = {"source_type": {"$eq": "notes"}}

    if source:
        chroma_filter = {
            "$and": [
                {"source_type": {"$eq": "notes"}},
                {"source":      {"$eq": source}},
            ]
        }

    results = db.similarity_search_with_relevance_scores(
        query,
        k=top_k,
        filter=chroma_filter,
    )

    formatted = []

    for doc, score in results:                     # BUG FIX: append is inside loop
        logger.debug(f"RELEVANCE: {score:.3f}  source={doc.metadata.get('source')}")

        formatted.append({
            "text":      doc.page_content,
            "source":    doc.metadata.get("source",    "unknown"),
            "page":      doc.metadata.get("page",      0),
            "note_id":   doc.metadata.get("note_id"),
            "relevance": round(float(score) * 100, 1),
        })

    logger.info(f"{len(formatted)} chunks retrieved")
    return formatted

# ─────────────────────────────────────────────────────────
#  as_retriever — unchanged
# ─────────────────────────────────────────────────────────

def as_retriever(top_k: int = config.TOP_K):
    db = get_db()
    return db.as_retriever(search_kwargs={"k": top_k})

# ─────────────────────────────────────────────────────────
#  count — unchanged
# ─────────────────────────────────────────────────────────

def count() -> int:
    try:
        db = get_db()
        return db._collection.count()
    except Exception:
        logger.exception("Failed to count vectors")
        return 0

# ─────────────────────────────────────────────────────────
#  delete_note_vectors — unchanged
# ─────────────────────────────────────────────────────────

def delete_note_vectors(note_id: str):
    try:
        db = get_db()
        db._collection.delete(where={"note_id": note_id})
        logger.info(f"Deleted vectors for note {note_id}")
    except Exception:
        logger.exception("Failed to delete vectors")

# ─────────────────────────────────────────────────────────
#  delete_paper_vectors
#  NEW — cleans up paper chunks if a paper is re-uploaded
#  or deleted from the admin panel.
# ─────────────────────────────────────────────────────────

def delete_paper_vectors(source: str):
    try:
        db = get_db()
        db._collection.delete(where={"source": source})
        logger.info(f"Deleted vectors for paper source={source}")
    except Exception:
        logger.exception("Failed to delete paper vectors")

# ─────────────────────────────────────────────────────────
#  clear — unchanged, dev only
# ─────────────────────────────────────────────────────────

def clear():
    db = get_db()
    db.delete_collection()
    logger.warning("Vector collection cleared")