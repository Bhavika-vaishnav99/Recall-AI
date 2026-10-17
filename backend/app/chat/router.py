import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Path, HTTPException

from app.auth.dependencies import get_current_user
from app.chat.models import (
    ChatRequest,
    ChatResponse,
    ConversationItem,
    MessageItem,
)
from app.chat.services import (
    list_notebook_conversations,
    get_recent_conversation_messages,
    get_or_create_conversation,
)
from app.notebooks.services import notebook_owned_by
from app.rag.rag_service import execute_rag_chat

logger = logging.getLogger(__name__)

router = APIRouter()


async def _require_notebook_owner(notebook_id: str, current_user: dict) -> None:
    if not await notebook_owned_by(notebook_id, str(current_user["_id"])):
        raise HTTPException(status_code=404, detail="Notebook not found")


@router.post(
    "/notebooks/{notebook_id}/chat",
    response_model=ChatResponse,
    summary="Ask a question to the notebook AI assistant",
)
async def chat_with_notebook(
    request: ChatRequest,
    notebook_id: str = Path(..., description="ID of the notebook workspace"),
    current_user: dict = Depends(get_current_user),
):
    """
    Execute grounded RAG query against notebook sources and return Gemini answer with citations.
    """
    await _require_notebook_owner(notebook_id, current_user)
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    try:
        return await execute_rag_chat(
            notebook_id=notebook_id,
            user_message=request.message.strip(),
            conversation_id=request.conversation_id,
        )
    except Exception as exc:
        logger.error("Chat execution error for notebook %s: %s", notebook_id, exc)
        raise HTTPException(status_code=500, detail=f"RAG Chat error: {str(exc)}")


@router.get(
    "/notebooks/{notebook_id}/chat/conversations",
    response_model=List[ConversationItem],
    summary="List all chat conversations for a notebook",
)
async def get_conversations(
    notebook_id: str = Path(..., description="ID of the notebook workspace"),
    current_user: dict = Depends(get_current_user),
):
    """List all chat conversations belonging to a specific notebook."""
    await _require_notebook_owner(notebook_id, current_user)
    return await list_notebook_conversations(notebook_id)


@router.get(
    "/notebooks/{notebook_id}/chat/conversations/{conversation_id}",
    response_model=List[MessageItem],
    summary="Get message history for a conversation",
)
async def get_conversation_history(
    notebook_id: str = Path(..., description="ID of the notebook workspace"),
    conversation_id: str = Path(..., description="ID of the target conversation"),
    current_user: dict = Depends(get_current_user),
):
    """Fetch all messages for a specific conversation session."""
    await _require_notebook_owner(notebook_id, current_user)
    return await get_recent_conversation_messages(conversation_id, limit=50)


@router.post(
    "/notebooks/{notebook_id}/chat/conversations/new",
    response_model=ConversationItem,
    summary="Create a new conversation session",
)
async def create_new_conversation(
    notebook_id: str = Path(..., description="ID of the notebook workspace"),
    current_user: dict = Depends(get_current_user),
):
    """Create a new conversation thread for a notebook."""
    await _require_notebook_owner(notebook_id, current_user)
    return await get_or_create_conversation(notebook_id=notebook_id, initial_title="New Conversation")
