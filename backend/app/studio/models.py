from typing import Any, Dict, Literal
from pydantic import BaseModel, Field

StudioArtifactType = Literal["slides", "report", "flashcards", "quiz", "datatable"]


class StudioGenerateRequest(BaseModel):
    type: StudioArtifactType = Field(..., description="Which studio output to generate")


class StudioArtifactResponse(BaseModel):
    id: str
    notebook_id: str
    type: StudioArtifactType
    title: str
    content: Dict[str, Any]
    created_at: str
