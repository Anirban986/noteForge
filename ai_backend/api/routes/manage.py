"""
api/routes/manage.py
--------------------
GET    /health  — health check
GET    /count   — number of indexed chunks
DELETE /clear   — wipe all indexed data
"""

from fastapi import APIRouter
from services import vector_store

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "message": "API is running"}


@router.get("/count")
def count():
    return {"count": vector_store.count()}


@router.delete("/clear")
def clear():
    vector_store.clear()
    return {"message": "All indexed data cleared."}