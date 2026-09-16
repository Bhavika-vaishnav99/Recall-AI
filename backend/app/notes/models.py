from typing import Optional
from pydantic import BaseModel, Field


class NoteCreateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: str = Field("", max_length=50000)


class NoteUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = Field(None, max_length=50000)


class NoteResponse(BaseModel):
    id: str
    notebook_id: str
    title: str
    content: str
    created_at: str
    updated_at: str
