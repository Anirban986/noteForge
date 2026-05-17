"""
services/vector_store.py
------------------------

Lightweight production-ready vector store for MVP deployment.

Architecture:
    Text
      ↓ chunking
    Gemini Embeddings API
      ↓
    ChromaDB

Why this version?
- Removes sentence-transformers
- Removes torch dependency
- Reduces RAM usage dramatically
- Better for Render/Railway free tier
- Keeps proper RAG architecture

Requirements:
    pip install chromadb langchain-chroma langchain-google-genai

Environment:
    GEMINI_API_KEY=your_key
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

import config


# ─────────────────────────────────────────────────────────
#  TEXT SPLITTER
# ─────────────────────────────────────────────────────────

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=config.CHUNK_SIZE,
    chunk_overlap=config.CHUNK_OVERLAP,
    separators=[
        "\n\n",
        "\n",
        ". ",
        " ",
        ""
    ]
)


# ─────────────────────────────────────────────────────────
#  GEMINI EMBEDDINGS
# ─────────────────────────────────────────────────────────

_embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=config.GEMINI_API_KEY,
)


# ─────────────────────────────────────────────────────────
#  CHROMA VECTOR DATABASE
# ─────────────────────────────────────────────────────────

_db = Chroma(
    collection_name=config.COLLECTION_NAME,
    embedding_function=_embeddings,
    persist_directory=config.CHROMA_DB_PATH,
)


# ─────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    """
    Basic cleanup before embedding.
    """
    return (
        text.replace("\x00", " ")
            .strip()
    )


# ─────────────────────────────────────────────────────────
#  PUBLIC API
# ─────────────────────────────────────────────────────────

def store(
    pages: dict[int, str],
    source: str
) -> int:
    """
    Chunk pages and store embeddings in ChromaDB.

    Args:
        pages:
            dict of page_number → extracted text

        source:
            PDF filename (without extension)

    Returns:
        Number of stored chunks
    """

    # ── Convert pages → LangChain Documents ─────────────

    raw_docs = []

    for page_num, text in sorted(pages.items()):

        cleaned = _clean_text(text)

        if not cleaned:
            continue

        raw_docs.append(
            Document(
                page_content=cleaned,
                metadata={
                    "source": source,
                    "page": page_num,
                }
            )
        )

    if not raw_docs:
        raise ValueError(
            "No valid text content to store."
        )

    # ── Split into chunks ───────────────────────────────

    chunks = _splitter.split_documents(raw_docs)

    print(
        f"[vector_store] "
        f"{len(chunks)} chunks "
        f"from {len(raw_docs)} pages"
    )

    # ── Store embeddings in Chroma ─────────────────────

    print(
        "[vector_store] "
        "Generating embeddings...",
        end=" ",
        flush=True
    )

    _db.add_documents(chunks)

    print("done")

    print(
        f"[vector_store] "
        f"Stored in collection "
        f"'{config.COLLECTION_NAME}'"
    )

    return len(chunks)


def retrieve(
    query: str,
    top_k: int = config.TOP_K
) -> list[dict]:
    """
    Retrieve most relevant chunks.

    Args:
        query:
            User question

        top_k:
            Number of chunks to return

    Returns:
        List of formatted chunk dicts
    """

    if not query.strip():
        return []

    results = _db.similarity_search_with_relevance_scores(
        query,
        k=top_k
    )

    formatted = []

    for doc, score in results:

        formatted.append({
            "text":
                doc.page_content,

            "source":
                doc.metadata.get(
                    "source",
                    "unknown"
                ),

            "page":
                doc.metadata.get(
                    "page",
                    0
                ),

            "relevance":
                round(float(score) * 100, 1)
        })

    return formatted


def as_retriever(
    top_k: int = config.TOP_K
):
    """
    Return LangChain retriever.
    """

    return _db.as_retriever(
        search_kwargs={
            "k": top_k
        }
    )


def count() -> int:
    """
    Return total chunk count.
    """

    try:
        return _db._collection.count()

    except Exception:
        return 0


def clear():
    """
    Delete the entire collection.
    """

    _db.delete_collection()

    print(
        "[vector_store] "
        "Collection cleared."
    )