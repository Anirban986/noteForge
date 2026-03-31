import fitz  # PyMuPDF
import numpy as np
import cv2

def pdf_to_images(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")

    images = []

    for page in doc:
        pix = page.get_pixmap()
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n
        )
        images.append(img)

    return images