import fitz
from app.utils.pdf_to_image import pdf_to_images
from app.services.ocr_service import extract_text_from_images

async def extract_text(file):
    contents = await file.read()

    doc = fitz.open(stream=contents, filetype="pdf")

    text = ""

    # 🔹 Try normal extraction first
    for page in doc:
        text += page.get_text()

    # If text is too small → use OCR
    if len(text.strip()) < 100:
        images = pdf_to_images(contents)
        text = extract_text_from_images(images)

    return text