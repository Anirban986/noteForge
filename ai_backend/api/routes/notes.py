"""
api/routes/notes.py
-------------------
POST /notes       — Free mode: general Topper's Notes
POST /notes/exam  — Exam mode (premium): exam-specific Topper's Notes

Both routes return the same TopperNotes schema so the frontend
renders them identically — exam mode just produces richer,
exam-tuned content with exam_tip callout blocks.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services import vector_store, generator
#from services.generator import ExamContext

router = APIRouter()


# ── Request models ────────────────────────────────────────

class FreeNotesRequest(BaseModel):
    topic: Optional[str] = None   # optional focus topic


class ExamNotesRequest(BaseModel):
    exam:    str = None   # e.g. "GATE", "JEE", "NEET", "UPSC", "CAT"
    subject: str = None   # e.g. "Data Structures", "Physics"
    chapter: str = None   # e.g. "Sorting Algorithms", "Thermodynamics"
    topic:   Optional[str] = None   # optional extra focus within the chapter


# ── Routes ────────────────────────────────────────────────

@router.post("/notes")
def free_notes(body: FreeNotesRequest):
    """
    FREE MODE — Generate general Topper's Notes from indexed PDF content.

    Returns TopperNotes with:
    - overview     : 2-3 sentence summary
    - blocks       : ordered list of typed content blocks
                     (concept, keypoints, flowchart, table, mindmap, formula, callout)
    """
    if vector_store.count() == 0:
        raise HTTPException(
            status_code=404,
            detail="No notes found. Please ingest a PDF first."
        )

    search_query = body.topic if body.topic else "main topics key concepts definitions formulas"
    chunks = vector_store.retrieve(search_query, top_k=8)

    return generator.short_notes(chunks, topic=body.topic)


@router.post("/notes/exam")
def exam_notes(body: ExamNotesRequest):

    if vector_store.count() == 0:
        raise HTTPException(
            status_code=404,
            detail="No notes found. Please ingest a PDF first."
        )

    # Validate required fields
    missing = [f for f in ["exam", "subject", "chapter"] if not getattr(body, f)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Exam mode requires: {', '.join(missing)}"
        )

    #  Build search query
    search_query = (
        f"{body.chapter} {body.subject} {body.exam} "
        
    )

    chunks = vector_store.retrieve(search_query, top_k=10)

    #  Pass values directly (NO ExamContext)
    return generator.exam_notes(
        chunks,
        exam=body.exam,
        subject=body.subject,
        chapter=body.chapter,
        
    )