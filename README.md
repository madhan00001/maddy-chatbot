# Production-Ready ChatGPT-like LLM + RAG Chatbot

A complete, production-ready AI Chatbot application built from scratch featuring a ChatGPT-style interface, configurable LLM provider support (Gemini 3.8 Flash / OpenAI), server-side API key protection, persistent conversation history, and a full RAG (Retrieval-Augmented Generation) pipeline with document chunking, semantic vector search, and source citations.

---

## 1. Project Overview

This project provides both:
1. **Interactive Full-Stack Web Application**: Running live on Port 3000 with a ChatGPT-style UI, real-time streaming, document upload (PDF, TXT, DOCX), semantic search, and an interactive Phase 1 Learning Console.
2. **Modular Python FastAPI Backend**: Located in `backend/`, fully configured for local development, unit tests, and Docker deployment with PostgreSQL and FAISS.

---

## 2. Overall Architecture

```text
                           USER
                             │
                             ▼
                    +-----------------+
                    |    React UI     |
                    +--------+--------+
                             │
                             │ HTTP / SSE Stream
                             ▼
                    +-----------------+
                    |  Backend API    |
                    | (FastAPI / Node)|
                    +--------+--------+
                             │
               +-------------+-------------+
               │                           │
               ▼                           ▼
         +-----------+               +-----------+
         |    LLM    |               |    RAG    |
         |    API    |               | Pipeline  |
         +-----------+               +-----+-----+
                                           │
                                           ▼
                                    +-------------+
                                    | Embeddings  |
                                    +------+------+
                                           │
                                           ▼
                                    +-------------+
                                    |   FAISS     |
                                    | Vector Store|
                                    +------+------+
                                           │
                                           ▼
                                    User Documents
```

---

## 3. RAG Pipeline Explained

Retrieval-Augmented Generation (RAG) grounds the LLM in your private knowledge base, preventing hallucinations:

1. **Upload Document**: User uploads a PDF, TXT, or DOCX document.
2. **Extract Text**: The backend extracts clean plain text from the file.
3. **Split Into Chunks**: Configurable `chunk_size` (800 characters) and `chunk_overlap` (100 characters) maintain context across boundaries.
4. **Generate Embeddings**: Each text chunk is converted into a high-dimensional vector using an embedding model (`gemini-embedding-2-preview`).
5. **Store Vectors**: Vectors and chunk metadata (`filename`, `chunk_index`, `page_number`, `text`) are saved in the vector store.
6. **Query & Semantic Search**: When the user asks a question, a query vector is generated and compared against all chunk vectors via cosine similarity.
7. **Context Injection**: The top $K$ ($K=4$) relevant chunks are retrieved and injected into the LLM system prompt.
8. **Generation with Citations**: The LLM synthesizes an answer using the retrieved context and returns verifiable source citations.

---

## 4. Phase 1: Beginner-Friendly Breakdown

### What are we building in Phase 1?
The foundational **Chat API** that receives a user message, forwards it to the LLM API, and returns an answer.

### Why do we need it?
To keep API keys secure on the server side and validate input/output schemas before connecting complex RAG components.

### Directory Structure for Phase 1:
```text
backend/
├── app/
│   ├── main.py              # FastAPI app definition & CORS
│   ├── config.py            # BaseSettings configuration (.env)
│   ├── schemas/
│   │   └── chat.py          # Pydantic ChatRequest & ChatResponse
│   ├── services/
│   │   └── llm_service.py   # Multi-provider LLM connector
│   └── api/
│       └── chat.py          # POST /api/chat route
├── requirements.txt         # Dependencies
├── Dockerfile               # Container build file
└── tests/
    └── test_phase1.py       # Pytest suite
```

### Running Phase 1 Locally

```bash
# 1. Enter the backend folder
cd backend

# 2. Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install required packages
pip install -r requirements.txt

# 4. Set your API Key
export GEMINI_API_KEY="your-gemini-api-key"

# 5. Start the FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Testing Phase 1

**Health check:**
```bash
curl http://localhost:8000/api/health
```

**Chat request:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain what is an API in simple terms.",
    "conversation_id": "demo-convo-1"
  }'
```

**Run automated unit tests:**
```bash
pytest tests/test_phase1.py
```

---

## 5. Docker Deployment

To launch the complete multi-container system (FastAPI backend + PostgreSQL + React UI):

```bash
docker compose up --build
```

---

## 6. Security Guarantees

- **No Browser API Keys**: All LLM calls execute server-side (`server.ts` or FastAPI).
- **Prompt Injection Defense**: Retrieved document text is labeled as untrusted context and wrapped with strict system boundaries.
- **File Validation**: File type, size limits (15MB), and encoding are verified before processing.
