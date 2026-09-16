from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentChunkResponse(BaseModel):
    id: str
    source_id: str
    notebook_id: str
    chunk_index: int
    page_number: Optional[int] = 1
    text: str
    char_count: int


class SourceResponse(BaseModel):
    id: str
    notebook_id: str
    title: str
    file_type: str
    file_size: int
    status: str  # "uploading" | "processing" | "ready" | "failed"
    error_message: Optional[str] = None
    chunk_count: int = 0
    char_count: int = 0
    is_active: bool = True
    created_at: str
    updated_at: str


class SourceDetailResponse(BaseModel):
    source: SourceResponse
    chunks: List[DocumentChunkResponse]


class SourceActiveUpdateRequest(BaseModel):
    is_active: bool


class SelectAllSourcesRequest(BaseModel):
    is_active: bool
