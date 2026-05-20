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

Optimized for:
- Render deployment
- Low RAM usage
- No torch dependency
- Batched embeddings
- Multi-user isolation
- Better retrieval quality
"""

from typing import List
import logging

from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_google_genai import GoogleGenerativeAIEmbeddings

from langchain_chroma import Chroma

from langchain_core.documents import Document

import config

# ─────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────

EMBED_BATCH_SIZE = 50

MIN_CHUNK_LENGTH = 30

MIN_RELEVANCE_SCORE = 0.55


# ─────────────────────────────────────────────────────────
# Text Splitter
# ─────────────────────────────────────────────────────────

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=config.CHUNK_SIZE,
    chunk_overlap=config.CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
)


# ─────────────────────────────────────────────────────────
# Gemini Embeddings
# ─────────────────────────────────────────────────────────

_embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001", google_api_key=config.GEMINI_API_KEY
)


# ─────────────────────────────────────────────────────────
# ChromaDB Factory
# ─────────────────────────────────────────────────────────


def get_db():
    """
    Return ChromaDB instance.
    """

    return Chroma(
        collection_name=config.COLLECTION_NAME,
        embedding_function=_embeddings,
        persist_directory=config.CHROMA_DB_PATH,
    )


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────


def _clean_text(text: str) -> str:
    """
    Basic text cleanup.
    """

    return text.replace("\x00", " ").replace("\r", " ").strip()


def _is_valid_chunk(text: str) -> bool:
    """
    Skip useless OCR garbage.
    """

    if not text:
        return False

    cleaned = text.strip()

    if len(cleaned) < MIN_CHUNK_LENGTH:
        return False

    return True


# ─────────────────────────────────────────────────────────
# Build Documents
# ─────────────────────────────────────────────────────────


def _build_documents(
    pages: dict[int, str],
    source: str,
) -> List[Document]:
    """
    Convert OCR pages into LangChain docs.
    """

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
                    "page": page_num,
                },
            )
        )

    return raw_docs


# ─────────────────────────────────────────────────────────
# Store Embeddings
# ─────────────────────────────────────────────────────────


def store_embeddings(
    pages: dict[int, str],
    source: str,
) -> int:
    """
    Store document embeddings.

    Returns:
        Number of chunks stored
    """

    logger.info("Preparing documents")

    raw_docs = _build_documents(
        pages=pages,
        source=source,
    )

    if not raw_docs:

        raise ValueError("No valid content to store")

    # ─────────────────────────────────────
    # Split documents
    # ─────────────────────────────────────

    chunks = _splitter.split_documents(raw_docs)

    chunks = [chunk for chunk in chunks if _is_valid_chunk(chunk.page_content)]

    if not chunks:

        raise ValueError("No valid chunks generated")

    logger.info(f"{len(chunks)} chunks generated")

    # ─────────────────────────────────────
    # Vector DB
    # ─────────────────────────────────────

    db = get_db()

    # ─────────────────────────────────────
    # Batched embeddings
    # ─────────────────────────────────────

    logger.info("Generating embeddings")

    total_chunks = len(chunks)

    for i in range(0, total_chunks, EMBED_BATCH_SIZE):

        batch = chunks[i : i + EMBED_BATCH_SIZE]

        db.add_documents(batch)

        logger.info(
            f"Embedded batch "
            f"{i + 1}"
            f"-"
            f"{min(i + EMBED_BATCH_SIZE, total_chunks)}"
            f"/{total_chunks}"
        )

    logger.info("Embeddings stored successfully")

    return total_chunks


# ─────────────────────────────────────────────────────────
# Retrieve Chunks
# ─────────────────────────────────────────────────────────


def retrieve(query: str, top_k: int = config.TOP_K) -> list[dict]:
    """
    Retrieve relevant chunks.

    Multi-user safe.
    """

    if not query.strip():
        return []

    db = get_db()

    results = db.similarity_search_with_relevance_scores(query, k=top_k)

    formatted = []

    for doc, score in results:

        print("RELEVANCE:", score)

    formatted.append(
        {
            "text": doc.page_content,
            "source": doc.metadata.get("source", "unknown"),
            "page": doc.metadata.get("page", 0),
            "note_id": doc.metadata.get("note_id"),
            "relevance": round(float(score) * 100, 1),
        }
    )

    logger.info(f"{len(formatted)} chunks retrieved")

    return formatted


# ─────────────────────────────────────────────────────────
# Retriever
# ─────────────────────────────────────────────────────────


def as_retriever(top_k: int = config.TOP_K):
    """
    Return LangChain retriever.
    """

    db = get_db()

    return db.as_retriever(search_kwargs={"k": top_k})


# ─────────────────────────────────────────────────────────
# Count Chunks
# ─────────────────────────────────────────────────────────


def count() -> int:
    """
    Count stored vectors.
    """

    try:

        db = get_db()

        return db._collection.count()

    except Exception:

        logger.exception("Failed to count vectors")

        return 0


# ─────────────────────────────────────────────────────────
# Delete Note Embeddings
# ─────────────────────────────────────────────────────────


def delete_note_vectors(note_id: str):
    """
    Delete embeddings for a note.
    """

    try:

        db = get_db()

        db._collection.delete(where={"note_id": note_id})

        logger.info(f"Deleted vectors " f"for note {note_id}")

    except Exception:

        logger.exception("Failed to delete vectors")


# ─────────────────────────────────────────────────────────
# Dangerous Admin Utility
# ─────────────────────────────────────────────────────────


def clear():
    """
    Delete entire collection.

    DEV ONLY.
    """

    db = get_db()

    db.delete_collection()

    logger.warning("Vector collection cleared")
