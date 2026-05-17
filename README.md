# 📚 ShortNotes AI — Intelligent Study Notes Generator

> Transform scanned PDFs into smart, exam-ready notes powered by OCR, RAG, and LLMs.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![AWS S3](https://img.shields.io/badge/Storage-AWS%20S3-orange.svg)](https://aws.amazon.com/s3)
[![Vector DB](https://img.shields.io/badge/VectorDB-Pinecone%2FChroma-purple.svg)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Modes](#-modes)
- [System Architecture](#-system-architecture)
- [Full Pipeline Walkthrough](#-full-pipeline-walkthrough)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**NoteForge** is a full-stack AI-powered platform that converts scanned PDF textbooks, handwritten notes, or study materials into concise, intelligent short notes. It leverages **OCR**, **Retrieval-Augmented Generation (RAG)**, and **LLMs** to surface exactly what matters — whether you're studying casually or preparing for a high-stakes exam.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📄 **Scanned PDF Support** | Upload any scanned PDF — handwritten or printed |
| 🔍 **OCR Extraction** | Accurate text extraction using google-cloud-vision ocr |
| 🧠 **RAG Pipeline** | Chunks, embeds, and retrieves the most relevant content |
| 📝 **Smart Short Notes** | LLM-generated concise notes tailored to the content |
| 🎯 **Exam Mode** | Exam-specific notes, ML insights, chapter weightage, trends |
| 📊 **Mock Tests** | Auto-generated MCQs and subjective questions from your notes |
| ☁️ **Cloud Storage** | All files securely stored on AWS S3 |
| ⚡ **Scalable Backend** | Chunking + vector storage for fast, context-aware retrieval |

---

## 🎛️ Modes

### 🟢 Normal Mode
Upload your scanned PDF and get clean, concise short notes in seconds.

- No configuration required
- Covers all topics uniformly
- Great for quick revision

### 🔴 Exam Mode
Upload your PDF and optionally specify an exam (e.g., JEE, UPSC, GATE, NEET, etc.) to get:

- **Exam-specific notes** — Highlights content relevant to your target exam
- **Chapter Weightage** — Which chapters/topics carry the most marks
- **Exam Trends** — Historically frequently asked topics (via ML analysis)
- **ML Insights** — Pattern recognition across past exam data
- **Mock Tests** — Auto-generated questions with difficulty calibration

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser / App)                         │
│                                                                         │
│   ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐   │
│   │  Upload PDF  │    │  Select Mode     │    │  View Notes / Test  │   │
│   │  (Scanned)   │    │  Normal / Exam   │    │  Dashboard          │   │
│   └──────┬───────┘    └────────┬─────────┘    └──────────▲──────────┘   │
│          │                    │                          │               │
└──────────┼────────────────────┼──────────────────────────┼───────────────┘
           │   HTTPS / REST     │                          │
           ▼                    ▼                          │
┌─────────────────────────────────────────────────────────┼───────────────┐
│                        BACKEND API SERVER                │               │
│                                                          │               │
│  ┌──────────────────┐   ┌──────────────────────────┐    │               │
│  │  File Upload     │   │   Mode Router             │    │               │
│  │  Handler         │──▶│   (Normal / Exam)         │    │               │
│  └──────┬───────────┘   └──────────┬───────────────┘    │               │
│         │                          │                     │               │
│         ▼                          ▼                     │               │
│  ┌──────────────┐    ┌─────────────────────────────┐    │               │
│  │  AWS S3      │    │   AI Processing Pipeline     │    │               │
│  │  Storage     │    │   (see pipeline below)        │────┘               │
│  └──────────────┘    └─────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Full Pipeline Walkthrough

### Step 1 — File Upload & Cloud Storage

```
User uploads scanned PDF
        │
        ▼
┌───────────────────┐
│   Backend API     │  ── Validates file type / size
│   (FastAPI)       │  ── Generates unique file key
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│    AWS S3 Bucket  │  ── Stores original PDF
│                   │  ── Returns public/presigned URL
└───────────────────┘
```

---

### Step 2 — OCR Text Extraction

```
┌───────────────────────────────────┐
│        AI Backend Service         │
│                                   │
│  1. Fetch file URL from S3        │
│  2. Download PDF temporarily      │
│  3. Run OCR engine                │
│
│  4. Clean & normalize raw text    │
│  5. Delete temp file              │
└───────────────────┬───────────────┘
                    │
                    ▼
          Extracted Raw Text
```

---

### Step 3 — Chunking & Embedding

```
Raw Text
   │
   ▼
┌──────────────────────────────────────┐
│         Text Chunking Engine          │
│                                      │
│  Strategy: Semantic / Fixed-window   │
│  ├─ Chunk size: ~500 tokens          │
│  ├─ Overlap: ~50 tokens              │
│  └─ Metadata: page no., heading tag  │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        Embedding Model               │
│  (e.g., GoogleGenerativeAIEmbeddings)│
│                                      │
│  Each chunk → high-dim vector        │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          Vector Database             │
│             ( Chroma)                │
│                                      │
│  Stores: vector + chunk metadata     │
└──────────────────────────────────────┘
```

---

### Step 4 — RAG + LLM Note Generation

```
User Request (Normal / Exam Mode)
         │
         ▼
┌─────────────────────────────────────────┐
│         Query Construction              │
│  Normal: "Summarize all key concepts"   │
│  Exam:   "Focus on [exam] high-weight   │
│           topics and trends"            │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│     Semantic Search (Vector DB)         │
│  Top-K most relevant chunks retrieved   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          LLM ( Gemini)                  │
│                                         │
│  Prompt = [System Role]                 │
│          + [Retrieved Chunks]           │
│          + [Mode-specific Instructions] │
│                                         │
│  Output: Structured Short Notes         │
└─────────────────────────────────────────┘
```

---

### Step 5 — Exam Mode: ML Insights & Trends

```
Exam Mode Activated
        │
        ├──▶ Chapter Weightage Analyzer
        │        └─ Frequency of concepts per chapter
        │           mapped to past exam data
        │
        ├──▶ Trend Detection (ML Model)
        │        └─ Pattern matching of topics
        │           with historical exam question sets
        │
        ├──▶ Difficulty Calibration
        │        └─ Tags topics as Easy / Medium / Hard
        │           based on exam history
        │
        └──▶ ML Insights Summary
                 └─ "Topic X appeared in 78% of
                    papers in the last 5 years"
```

---

### Step 6 — Mock Test Generation

```
Short Notes (Generated)
         │
         ▼
┌───────────────────────────────────────┐
│        Mock Test Generator            │
│                                       │
│  ├─ MCQ (Multiple Choice Questions)   │
│  ├─ True / False                      │
│  ├─ Short Answer                      │
│  └─ Difficulty: Easy / Medium / Hard  │
│                                       │
│  LLM Prompt:                          │
│  "Based on these notes, generate N    │
│   questions covering all key topics"  │
└───────────────────────────────────────┘
         │
         ▼
    Mock Test UI
  (Interactive, scored)
```

---

## 🧰 Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React.js  |
| UI Library | Tailwind CSS / ShadCN |
| State Management | Zustand / React Query |
| PDF Preview | react-pdf |

### Backend
| Layer | Technology |
|---|---|
| API Server | FastAPI (Python) |
| File Handling | Multipart upload → AWS S3 via `boto3` |
| OCR Engine | Google-cloud-vision ocr|
| Text Chunking | LangChain `RecursiveCharacterTextSplitter` |
| Embeddings | OpenAI `text-embedding-ada-002` / Cohere |
| Vector Store | ChromaDB |
| LLM | Gemini Pro |
| Orchestration | LangChain / LlamaIndex |

### Infrastructure
| Layer | Technology |
|---|---|
| Cloud Storage | AWS S3 |
| Hosting | Render |


---

## 📁 Project Structure

```
shortnotes-ai/
│
├── frontend/                    # React / Next.js client
│   ├── components/
│   │   ├── UploadZone.tsx       # PDF drag-and-drop uploader
│   │   ├── ModeSelector.tsx     # Normal / Exam mode toggle
│   │   ├── NotesViewer.tsx      # Rendered notes display
│   │   ├── MockTest.tsx         # Interactive mock test UI
│   │   └── ExamInsights.tsx     # Weightage, trends, ML insights
│   ├── pages/
│   └── public/
│
├── backend/                     # FastAPI backend
│   ├── main.py                  # Entry point, route registration
│   ├── routes/
│   │   ├── upload.py            # File upload → S3
│   │   ├── notes.py             # Notes generation endpoint
│   │   └── test.py              # Mock test endpoint
│   ├── services/
│   │   ├── s3_service.py        # AWS S3 upload/download
│   │   ├── ocr_service.py       # OCR text extraction
│   │   ├── chunker.py           # Text chunking logic
│   │   ├── embedder.py          # Embedding generation
│   │   ├── vector_store.py      # Vector DB operations
│   │   ├── notes_generator.py   # RAG + LLM pipeline
│   │   ├── exam_analyzer.py     # Exam trends + ML insights
│   │   └── test_generator.py    # Mock test generation
│   ├── models/                  # Pydantic schemas
│   ├── config.py                # Env config loader
│   └── requirements.txt
│
├── ml/                          # ML models for exam insights
│   ├── trend_model.py           # Historical exam trend detection
│   ├── weightage_model.py       # Chapter weightage scoring
│   └── datasets/                # Past exam question datasets
│
├── docker-compose.yml           # Local dev stack
├── .env.example                 # Environment variable template
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- AWS account (S3 bucket configured)
- OpenAI / Anthropic / Cohere API key
- Pinecone / ChromaDB instance

### 1. Clone the Repository

```bash
git clone https://github.com/Anirban986/noteForge.git
cd Noteforge
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env        # Fill in your credentials
uvicorn api.app:app --reload
```

### 3. Frontend Setup

```bash
cd /Note forge/
npm install
cp .env.example .env.local     # Add NEXT_PUBLIC_API_URL
npm run dev
```



## 🔐 Environment Variables

```env
# AWS
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=shortnotes-pdfs

# LLM
GEMINI_API_KEY=AI...

GOOGLE_APPLICATION_CREDENTIALS=



# App
DEBUG=false
MAX_FILE_SIZE_MB=20
```

---

## 📡 API Reference

### `POST /api/upload`
Upload a scanned PDF to S3.

| Field | Type | Description |
|---|---|---|
| `file` | `multipart/form-data` | The scanned PDF file |
| `mode` | `string` | `"normal"` or `"exam"` |
| `exam_name` | `string` *(optional)* | e.g., `"JEE"`, `"GATE"` |

**Response:**
```json
{
  "file_id": "uuid-1234",
  "s3_url": "https://s3.amazonaws.com/...",
  "status": "uploaded"
}
```

---

### `POST /api/generate-notes`
Trigger note generation pipeline.

```json
{
  "file_id": "uuid-1234",
  "mode": "exam",
  "exam_name": "GATE CSE"
}
```

**Response:**
```json
{
  "notes": [...],
  "chapter_weightage": {...},
  "exam_trends": [...],
  "ml_insights": "..."
}
```

---

### `POST /api/mock-test`
Generate a mock test from notes.

```json
{
  "file_id": "uuid-1234",
  "num_questions": 20,
  "difficulty": "medium"
}
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get involved:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add: your feature description'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for code style guidelines and commit conventions.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Built with ❤️ for students everywhere.</strong><br/>
  <sub>If this helped you, give it a ⭐ on GitHub!</sub>
</div>