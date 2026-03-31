from fastapi import APIRouter, UploadFile, File, Form
from app.services.rag_service import generate_notes

router = APIRouter()

@router.post("/generate-notes/")
async def generate_notes_api(
    file: UploadFile = File(...),
    mode: str = Form(...),
    exam: str = Form(None),
    subject: str = Form(None),
    chapters: str = Form(None)
):
    notes = await generate_notes(file, mode, exam, subject, chapters)

    return {
        "notes": notes,
        "status": "success"
    }