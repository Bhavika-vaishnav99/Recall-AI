from typing import Optional
from pydantic import BaseModel, Field


class NotebookCreateRequest(BaseModel):
    title: Optional[str] = Field(None, description="Notebook display title")


class NotebookRenameRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)


class NotebookCustomizeRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    cover_image: Optional[str] = Field(
        None, description="Base64 data URI, or empty string to remove the cover image"
    )
    use_custom_summary: Optional[bool] = None
    custom_summary_text: Optional[str] = Field(None, max_length=4000)


class NotebookResponse(BaseModel):
    id: str
    title: str
    source_count: int
    cover_image: Optional[str] = None
    use_custom_summary: bool = False
    custom_summary_text: Optional[str] = None
    created_at: str
    updated_at: str


class NotebookSummaryResponse(BaseModel):
    title: str
    summary: str
    generated_at: str
