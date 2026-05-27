FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 7860

# Point to api/app.py, not app.py
CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "7860"]