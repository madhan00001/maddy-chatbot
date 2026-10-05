from fastapi import APIRouter, HTTPException
import uuid
import logging
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.llm_service import llm_service
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.post("", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """
    Phase 1 Core Endpoint:
    Receives user query, forwards through LLM service with memory/history context,
    and returns a structured response.
    """
    try:
        conversation_id = request.conversation_id or str(uuid.uuid4())

        # Generate response using LLM service
        ai_text = await llm_service.generate_response(
            prompt=request.message,
            history=request.history,
            system_instruction=request.system_instruction
        )

        return ChatResponse(
            response=ai_text,
            conversation_id=conversation_id,
            model=settings.LLM_MODEL,
            sources=[]
        )
    except Exception as e:
        logger.exception("Error in chat endpoint")
        raise HTTPException(status_code=500, detail=str(e))
