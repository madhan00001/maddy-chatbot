import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    """
    Application Settings
    Loads configuration from environment variables and .env file.
    No hardcoded API keys or secrets!
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # App Config
    APP_NAME: str = "ChatGPT-like LLM + RAG Chatbot"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # LLM Settings (Configurable between providers: google, openai, groq, etc.)
    LLM_PROVIDER: str = "google"
    LLM_MODEL: str = "gemini-3.8-flash"
    LLM_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # Embeddings Settings
    EMBEDDING_PROVIDER: str = "google"
    EMBEDDING_MODEL: str = "gemini-embedding-2-preview"

    # RAG Settings
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 100
    TOP_K: int = 5
    VECTOR_DB_PATH: str = "./data/vector_store"

    # Database
    DATABASE_URL: Optional[str] = "sqlite:///./data/chatbot.db"

    def get_api_key(self) -> str:
        """Returns the appropriate API key depending on configuration."""
        key = self.LLM_API_KEY or self.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        return key

settings = Settings()
