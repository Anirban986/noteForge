import pytesseract
import cv2

def extract_text_from_images(images):
    text = ""

    for img in images:
        #  Preprocessing 
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1]

        # OCR
        page_text = pytesseract.image_to_string(thresh)
        text += page_text + "\n"

    return text