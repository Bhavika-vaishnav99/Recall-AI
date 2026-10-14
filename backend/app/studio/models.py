from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

StudioArtifactType = Literal["slides", "report", "flashcards", "quiz", "datatable"]

CountPreset = Literal["fewer", "standard", "more"]
DifficultyLevel = Literal["easy", "medium", "hard"]
QuestionType = Literal["multiple_choice", "multiple_select", "fill_blank", "short_answer"]


class StudioGenerateOptions(BaseModel):
    count: CountPreset = "standard"
    difficulty: DifficultyLevel = "medium"
    question_types: List[QuestionType] = Field(
        default_factory=lambda: ["multiple_choice", "multiple_select"]
    )
    topic: Optional[str] = Field(None, max_length=2000)
    source_ids: Optional[List[str]] = Field(
        None, description="Restrict generation to these sources; defaults to all active sources"
    )


class StudioGenerateRequest(BaseModel):
    type: StudioArtifactType = Field(..., description="Which studio output to generate")
    options: StudioGenerateOptions = Field(default_factory=StudioGenerateOptions)
    defer: bool = Field(
        False,
        description="Queue the generation for the next off-peak window instead of running it now",
    )


class StudioArtifactResponse(BaseModel):
    id: str
    notebook_id: str
    type: StudioArtifactType
    title: str
    content: Dict[str, Any]
    options: Optional[Dict[str, Any]] = None
    status: str = "ready"  # "ready" | "scheduled" | "failed"
    scheduled_for: Optional[str] = None
    error: Optional[str] = None
    created_at: str
