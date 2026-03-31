import easyocr
import cv2

#  Load once (VERY IMPORTANT for performance)
reader = easyocr.Reader(['en'], gpu=False)

def extract_text_from_images(images):
    text = ""

    for img in images:
        # 🔹 Preprocessing (improves accuracy)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Optional: threshold (can experiment)
        thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1]

        #  EasyOCR
        results = reader.readtext(thresh)

        # Extract only text
        page_text = " ".join([res[1] for res in results])
        text += page_text + "\n"

    return text