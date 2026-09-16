import logging
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId

from app.core.database import db
from app.sources.services import serialize_id, get_active_source_ids
from app.gemini.gemini_service import generate_structured_json

logger = logging.getLogger(__name__)

MAX_CONTEXT_CHARS = 24000

# System instruction shared by every studio generator: grounds the model in
# the notebook's own content only, same anti-hallucination rule as chat.
_BASE_SYSTEM_INSTRUCTION = (
    "You are Recall AI's Studio content generator. Base your output strictly "
    "on the SOURCE MATERIAL provided. Do not invent facts that aren't "
    "supported by it. Respond with JSON only, matching the requested shape "
    "exactly, with no markdown fences or extra commentary."
)


class NoSourceContentError(Exception):
    """Raised when a notebook has no processed source chunks to generate from."""


async def _get_notebook_context(notebook_id: str, max_chars: int = MAX_CONTEXT_CHARS) -> str:
    """Concatenate the notebook's document chunks (dedup by source) up to a char budget."""
    chunk_filter: dict = {"notebook_id": notebook_id}
    active_source_ids = await get_active_source_ids(notebook_id)
    if active_source_ids is not None:
        chunk_filter["source_id"] = {"$in": active_source_ids}

    cursor = db.db.document_chunks.find(chunk_filter).sort(
        [("source_id", 1), ("chunk_index", 1)]
    )
    parts: List[str] = []
    total_chars = 0
    async for chunk in cursor:
        text = chunk.get("text", "")
        if not text:
            continue
        if total_chars + len(text) > max_chars:
            remaining = max_chars - total_chars
            if remaining > 200:
                parts.append(text[:remaining])
            break
        parts.append(text)
        total_chars += len(text)

    if not parts:
        raise NoSourceContentError("This notebook has no processed source content yet.")

    return "\n\n".join(parts)


def _build_prompt(artifact_type: str, context: str) -> str:
    if artifact_type == "flashcards":
        return (
            "SOURCE MATERIAL:\n" + context + "\n\n"
            "Generate 8-12 flashcards covering the most important facts, "
            "definitions, and concepts in the source material.\n"
            'Respond with JSON: {"cards": [{"question": string, "answer": string}, ...]}'
        )
    if artifact_type == "quiz":
        return (
            "SOURCE MATERIAL:\n" + context + "\n\n"
            "Generate a 5-8 question multiple-choice quiz testing understanding "
            "of the source material. Each question has exactly 4 options, one correct.\n"
            'Respond with JSON: {"questions": [{"question": string, "options": '
            '[string, string, string, string], "correct_index": integer (0-3), '
            '"explanation": string}, ...]}'
        )
    if artifact_type == "report":
        return (
            "SOURCE MATERIAL:\n" + context + "\n\n"
            "Write a briefing report summarizing the source material: an overview "
            "summary plus 3-6 thematic sections.\n"
            'Respond with JSON: {"title": string, "summary": string, "sections": '
            '[{"heading": string, "content": string}, ...]}'
        )
    if artifact_type == "slides":
        return (
            "SOURCE MATERIAL:\n" + context + "\n\n"
            "Create a slide deck outline summarizing the source material: 6-10 "
            "slides, each with a short title and 3-5 concise bullet points.\n"
            'Respond with JSON: {"title": string, "slides": [{"title": string, '
            '"bullets": [string, ...]}, ...]}'
        )
    if artifact_type == "datatable":
        return (
            "SOURCE MATERIAL:\n" + context + "\n\n"
            "Extract the key facts, entities, or comparisons from the source "
            "material into a structured data table (choose sensible columns "
            "for this content, e.g. Topic/Detail, or Question/Answer/Page).\n"
            'Respond with JSON: {"title": string, "columns": [string, ...], '
            '"rows": [[string, ...], ...]}'
        )
    raise ValueError(f"Unknown studio artifact type: {artifact_type}")


def _default_title(artifact_type: str, content: dict) -> str:
    if content.get("title"):
        return content["title"]
    return {
        "flashcards": "Flashcards",
        "quiz": "Quiz",
        "report": "Briefing report",
        "slides": "Slide deck",
        "datatable": "Data table",
    }.get(artifact_type, "Studio output")


async def generate_studio_artifact(notebook_id: str, artifact_type: str) -> dict:
    """Generate a studio artifact from the notebook's sources and persist it."""
    context = await _get_notebook_context(notebook_id)
    prompt = _build_prompt(artifact_type, context)

    content = generate_structured_json(prompt, system_instruction=_BASE_SYSTEM_INSTRUCTION)

    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "notebook_id": notebook_id,
        "type": artifact_type,
        "title": _default_title(artifact_type, content),
        "content": content,
        "created_at": now_iso,
    }
    result = await db.db.studio_artifacts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_id(doc)


async def list_studio_artifacts(notebook_id: str) -> List[dict]:
    cursor = db.db.studio_artifacts.find({"notebook_id": notebook_id}).sort("created_at", -1)
    artifacts = []
    async for doc in cursor:
        artifacts.append(serialize_id(doc))
    return artifacts


async def get_studio_artifact(artifact_id: str) -> Optional[dict]:
    try:
        doc = await db.db.studio_artifacts.find_one({"_id": ObjectId(artifact_id)})
        return serialize_id(doc) if doc else None
    except Exception:
        return None


async def delete_studio_artifact(artifact_id: str) -> bool:
    try:
        res = await db.db.studio_artifacts.delete_one({"_id": ObjectId(artifact_id)})
        return res.deleted_count > 0
    except Exception:
        return False
