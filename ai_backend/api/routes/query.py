"""
api/routes/query.py
-------------------
POST /ask — ask a question, get a RAG-generated answer
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import vector_store, generator

router = APIRouter()


class AskRequest(BaseModel):
    question:  str
    use_chain: bool = False  # True = full LCEL chain, False = manual retrieve + generate


@router.post("/ask")
def ask(body: AskRequest):
    """
    Ask a question about your ingested notes.

    use_chain=false (default): retrieves chunks manually, returns source info
    use_chain=true: uses full LangChain LCEL RAG chain directly
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if vector_store.count() == 0:
        raise HTTPException(status_code=404, detail="No notes found. Please ingest a PDF first.")

    if body.use_chain:
        retriever = vector_store.as_retriever()
        chain     = generator.build_rag_chain(retriever)
        return {"answer": chain.invoke(body.question), "sources": []}

    chunks = vector_store.retrieve(body.question)
    return {
        "answer":  generator.answer(body.question, chunks),
        "sources": [
            {"source": c["source"], "page": c["page"], "relevance": c["relevance"]}
            for c in chunks
        ]
    }