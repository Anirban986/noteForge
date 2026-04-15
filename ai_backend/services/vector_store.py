"""
services/vector_store.py
------------------------
All embedding and vector DB operations via LangChain.

LangChain components used:
  - RecursiveCharacterTextSplitter  : smart text chunking
  - HuggingFaceEmbeddings           : local free embeddings
  - Chroma                          : persistent local vector store
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
import config

# ── initialise once at import ─────────────────────────────
_embeddings = HuggingFaceEmbeddings(
    model_name=config.EMBED_MODEL_NAME,
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=config.CHUNK_SIZE,
    chunk_overlap=config.CHUNK_OVERLAP,
    separators=["\n\n", "\n", ".", " ", ""]
)

_db = Chroma(
    collection_name=config.COLLECTION_NAME,
    embedding_function=_embeddings,
    persist_directory=config.CHROMA_DB_PATH
)


# ── public API ────────────────────────────────────────────

def store(pages: dict[int, str], source: str) -> int:
    """
    Chunk all pages and store embeddings in ChromaDB.

    Args:
        pages:  dict of page_number → markdown text
        source: PDF name stored as metadata

    Returns:
        number of chunks stored
    """
    # Wrap each page as a LangChain Document with metadata
    raw_docs = [
        Document(
            page_content=text,
            metadata={"source": source, "page": page_num}
        )
        for page_num, text in sorted(pages.items())
    ]

    # LangChain splits documents into chunks automatically
    chunks = _splitter.split_documents(raw_docs)
    print(f"[vector_store] {len(chunks)} chunks from {len(pages)} page(s)")

    print(f"[vector_store] Embedding and storing...", end=" ", flush=True)
    _db.add_documents(chunks)
    print("done")
    print(f"[vector_store] Stored in ChromaDB ('{config.COLLECTION_NAME}')")

    return len(chunks)


def retrieve(query: str, top_k: int = config.TOP_K) -> list[dict]:
    """
    Retrieve top-k most similar chunks for a query.

    Args:
        query: natural language question or topic string
        top_k: number of results to return

    Returns:
        list of dicts with keys: text, source, page, relevance
    """
    results = _db.similarity_search_with_relevance_scores(query, k=top_k)
    return [
        {
            "text":      doc.page_content,
            "source":    doc.metadata.get("source", "unknown"),
            "page":      doc.metadata.get("page", 0),
            "relevance": round(score * 100, 1)
        }
        for doc, score in results
    ]


def as_retriever(top_k: int = config.TOP_K):
    """
    Return a LangChain retriever — used directly in LCEL chains.
    """
    return _db.as_retriever(search_kwargs={"k": top_k})


def count() -> int:
    """Return total number of stored chunks."""
    return _db._collection.count()


def clear():
    """Delete all stored chunks from ChromaDB."""
    _db.delete_collection()
    print("[vector_store] Collection cleared.")