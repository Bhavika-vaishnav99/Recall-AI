from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class Citation(BaseModel):
    source_id: str
    source_name: str
    page: Optional[int] = 1
    chunk_id: str
    chunk_index: Optional[int] = 0
    similarity_score: float
    text: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User chat question")
    conversation_id: Optional[str] = Field(None, description="Existing conversation ID if continuing chat")


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    citations: List[Citation]
    sources_used: List[str]


class ConversationItem(BaseModel):
    id: str
    notebook_id: str
    title: str
    created_at: str
    updated_at: str


class MessageItem(BaseModel):
    id: str
    conversation_id: str
    notebook_id: str
    role: str  # "user" | "assistant"
    content: str
    citations: Optional[List[Citation]] = []
    sources_used: Optional[List[str]] = []
    created_at: str
