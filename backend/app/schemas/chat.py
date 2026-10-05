from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    role: str = Field(..., description="Role of the sender: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="The message text content")

class SourceCitation(BaseModel):
    document_id: Optional[str] = None
    filename: str
    chunk_index: int
    page: Optional[int] = 1
    snippet: str
    score: Optional[float] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="The user query or prompt")
    conversation_id: Optional[str] = Field(None, description="Optional conversation UUID to maintain history")
    history: Optional[List[Message]] = Field(default_factory=list, description="Recent conversation turns")
    use_rag: bool = Field(default=False, description="Whether to perform semantic search on uploaded documents")
    system_instruction: Optional[str] = Field(
        default="You are a helpful, accurate, and concise AI assistant modeled like ChatGPT.",
        description="Optional system instruction for persona or context"
    )

class ChatResponse(BaseModel):
    response: str = Field(..., description="The generated AI response")
    conversation_id: str = Field(..., description="Conversation identifier")
    model: str = Field(..., description="Model name used for generation")
    sources: List[SourceCitation] = Field(default_factory=list, description="Citations from retrieved documents if RAG was used")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
