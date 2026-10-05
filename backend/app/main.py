from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.chat import router as chat_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-Ready LLM & RAG Chatbot Backend built with FastAPI",
    version="1.0.0"
)

# CORS setup for local React dev server and Docker environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(chat_router)

@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "llm_provider": settings.LLM_PROVIDER,
        "model": settings.LLM_MODEL
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
