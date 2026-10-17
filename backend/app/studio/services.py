import logging
from datetime import datetime, timedelta, timezone
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


async def _get_notebook_context(
    notebook_id: str,
    max_chars: int = MAX_CONTEXT_CHARS,
    source_ids: Optional[List[str]] = None,
) -> str:
    """Concatenate the notebook's document chunks (dedup by source) up to a char budget."""
    chunk_filter: dict = {"notebook_id": notebook_id}
    if source_ids:
        # Explicit per-generation source selection wins over the panel's active flags.
        chunk_filter["source_id"] = {"$in": source_ids}
    else:
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


# How many items each "count" preset asks for, per artifact type.
_COUNT_RANGES = {
    "quiz": {"fewer": "3-4", "standard": "6-8", "more": "12-15"},
    "flashcards": {"fewer": "5-6", "standard": "8-12", "more": "18-24"},
    "slides": {"fewer": "4-5", "standard": "6-10", "more": "12-16"},
    "report": {"fewer": "2-3", "standard": "3-6", "more": "7-10"},
    "datatable": {"fewer": "5-8", "standard": "10-15", "more": "20-30"},
}

_DIFFICULTY_GUIDANCE = {
    "easy": (
        "Keep it easy: test recall of explicitly stated facts, using plain "
        "wording and obviously distinct wrong answers."
    ),
    "medium": (
        "Keep it moderately challenging: test understanding rather than pure "
        "recall, with plausible distractors."
    ),
    "hard": (
        "Make it hard: require synthesis across different parts of the material, "
        "with subtle, closely-related distractors."
    ),
}

_QUESTION_TYPE_SPECS = {
    "multiple_choice": (
        '- "multiple_choice": exactly 4 entries in "options", exactly one index '
        'in "correct_indices", "answer" set to "".'
    ),
    "multiple_select": (
        '- "multiple_select": 4-6 entries in "options", TWO OR MORE indices in '
        '"correct_indices", "answer" set to "".'
    ),
    "fill_blank": (
        '- "fill_blank": the question text contains "____" where the missing '
        'term goes; "options" is [], "correct_indices" is [], and "answer" is '
        "the exact missing word or short phrase."
    ),
    "short_answer": (
        '- "short_answer": an open question; "options" is [], "correct_indices" '
        'is [], and "answer" is a one-or-two-sentence model answer.'
    ),
}


def _topic_clause(topic: Optional[str]) -> str:
    if not topic or not topic.strip():
        return ""
    return (
        "\nFOCUS: restrict the output to this specific request from the user, "
        "while still only using facts from the source material: "
        f"{topic.strip()}\n"
    )


def _build_prompt(artifact_type: str, context: str, options: dict) -> str:
    count = options.get("count", "standard")
    difficulty = options.get("difficulty", "medium")
    topic = _topic_clause(options.get("topic"))
    amount = _COUNT_RANGES.get(artifact_type, {}).get(count, "")

    if artifact_type == "flashcards":
        return (
            "SOURCE MATERIAL:\n" + context + "\n\n"
            f"Generate {amount} flashcards covering the most important facts, "
            "definitions, and concepts in the source material. "
            f"{_DIFFICULTY_GUIDANCE.get(difficulty, '')}\n" + topic +
            'Respond with JSON: {"cards": [{"question": string, "answer": string}, ...]}'
        )

    if artifact_type == "quiz":
        requested_types = options.get("question_types") or ["multiple_choice"]
        specs = "\n".join(
            _QUESTION_TYPE_SPECS[t] for t in requested_types if t in _QUESTION_TYPE_SPECS
        )
        types_list = ", ".join(requested_types)
        return (
            "SOURCE MATERIAL:\n" + context + "\n\n"
            f"Generate a {amount} question quiz testing understanding of the "
            f"source material. {_DIFFICULTY_GUIDANCE.get(difficulty, '')}\n"
            f"Use ONLY these question types, mixed roughly evenly: {types_list}.\n"
            f"Type rules:\n{specs}\n" + topic +
            'Respond with JSON: {"questions": [{"type": string, "question": string, '
            '"options": [string, ...], "correct_indices": [integer, ...], '
            '"answer": string, "explanation": string}, ...]}'
        )

    if artifact_type == "report":
        return (
            "SOURCE MATERIAL:\n" + context + "\n\n"
            "Write an engaging briefing document / interactive report summarizing the source material in the exact style of Gemini NotebookLM. "
            "IMPORTANT FORMATTING RULES:\n"
            "- 'title': A compelling Title Case headline for the report.\n"
            "- 'summary': An engaging introductory overview setting up the context and core learning outcomes / takeaways. Format key takeaways as bullet points with bold verbs (e.g., 'By the end of this lesson, you will be able to:\n- **Navigate** core user workflows...\n- **Explain** how AI chatbots...').\n"
            f"- 'sections': Exactly {amount} rich, in-depth thematic sections. Section headings MUST be in Title Case (e.g. 'Navigating User Access and Chatbot Capabilities', NEVER ALL-CAPS). Each section content must be comprehensive, explanatory prose using Markdown paragraphs and bold keywords.\n"
            f"{_DIFFICULTY_GUIDANCE.get(difficulty, '')}\n" + topic +
            'Respond with JSON: {"title": string, "summary": string, "sections": '
            '[{"heading": string, "content": string}, ...]}'
        )


    if artifact_type == "slides":
        return (
            "SOURCE MATERIAL:\n" + context + "\n\n"
            f"Create a slide deck outline summarizing the source material: {amount} "
            "slides, each with a short title and 3-5 concise bullet points.\n" + topic +
            'Respond with JSON: {"title": string, "slides": [{"title": string, '
            '"bullets": [string, ...]}, ...]}'
        )

    if artifact_type == "datatable":
        return ( 
            "SOURCE MATERIAL:\n" + context + "\n\n"
            "Extract the key facts, entities, or comparisons from the source "
            "material into a structured data table (choose sensible columns "
            "for this content, e.g. Topic/Detail, or Question/Answer/Page). "
            f"Aim for {amount} rows.\n" + topic +
            'Respond with JSON: {"title": string, "columns": [string, ...], '
            '"rows": [[string, ...], ...]}'
        )

    raise ValueError(f"Unknown studio artifact type: {artifact_type}")


def _normalize_quiz_content(content: dict) -> dict:
    """
    Coerce quiz questions into one consistent shape. The model occasionally
    emits the older single-answer form (`correct_index`) or omits fields, and
    artifacts generated before question types existed use it too, so every
    consumer can rely on `type`/`options`/`correct_indices`/`answer`.
    """
    normalized = []
    for raw in content.get("questions", []):
        if not isinstance(raw, dict):
            continue

        options = [str(o) for o in (raw.get("options") or [])]
        indices = raw.get("correct_indices")
        if not isinstance(indices, list):
            indices = [raw["correct_index"]] if isinstance(raw.get("correct_index"), int) else []
        indices = [i for i in indices if isinstance(i, int) and 0 <= i < len(options)]

        answer = str(raw.get("answer") or "").strip()
        q_type = raw.get("type")
        if q_type not in _QUESTION_TYPE_SPECS:
            # Infer from the payload shape when the model omits/garbles the type.
            if not options and answer:
                q_type = "short_answer" if len(answer.split()) > 3 else "fill_blank"
            elif len(indices) > 1:
                q_type = "multiple_select"
            else:
                q_type = "multiple_choice"

        # A choice question with no resolvable answer key is ungradeable; drop it.
        if q_type in ("multiple_choice", "multiple_select") and not indices:
            continue
        if q_type in ("fill_blank", "short_answer") and not answer:
            continue
        if q_type == "multiple_choice":
            indices = indices[:1]

        normalized.append({
            "type": q_type,
            "question": str(raw.get("question", "")).strip(),
            "options": options,
            "correct_indices": indices,
            "answer": answer,
            "explanation": str(raw.get("explanation") or "").strip(),
        })

    return {**content, "questions": normalized}


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


async def generate_studio_artifact(
    notebook_id: str, artifact_type: str, options: Optional[dict] = None
) -> dict:
    """Generate a studio artifact from the notebook's sources and persist it."""
    options = options or {}
    context = await _get_notebook_context(
        notebook_id, source_ids=options.get("source_ids")
    )
    prompt = _build_prompt(artifact_type, context, options)

    content = generate_structured_json(prompt, system_instruction=_BASE_SYSTEM_INSTRUCTION)
    if artifact_type == "quiz":
        content = _normalize_quiz_content(content)

    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "notebook_id": notebook_id,
        "type": artifact_type,
        "title": _default_title(artifact_type, content),
        "content": content,
        "options": options,
        "status": "ready",
        "created_at": now_iso,
    }
    result = await db.db.studio_artifacts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_id(doc)


# "Generate later" defers work to an off-peak window, matching how the
# scheduled outputs read in the UI ("Scheduled for after 6pm").
OFF_PEAK_HOUR = 18


def _next_off_peak() -> datetime:
    now = datetime.now(timezone.utc).astimezone()
    target = now.replace(hour=OFF_PEAK_HOUR, minute=0, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return target


_SCHEDULED_TITLES = {
    "flashcards": "Flashcards",
    "quiz": "Quiz",
    "report": "Briefing report",
    "slides": "Slide deck",
    "datatable": "Data table",
}


async def schedule_studio_artifact(
    notebook_id: str, artifact_type: str, options: Optional[dict] = None
) -> dict:
    """Queue a studio artifact to be generated at the next off-peak window."""
    scheduled_for = _next_off_peak()
    doc = {
        "notebook_id": notebook_id,
        "type": artifact_type,
        "title": _SCHEDULED_TITLES.get(artifact_type, "Studio output"),
        "content": {},
        "options": options or {},
        "status": "scheduled",
        "scheduled_for": scheduled_for.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.db.studio_artifacts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_id(doc)


async def run_due_scheduled_artifacts() -> int:
    """
    Generate any scheduled artifacts whose time has come. Called periodically
    by the background worker started in the app lifespan.
    """
    now_iso = datetime.now(timezone.utc).astimezone().isoformat()
    cursor = db.db.studio_artifacts.find(
        {"status": "scheduled", "scheduled_for": {"$lte": now_iso}}
    )

    completed = 0
    async for doc in cursor:
        artifact_type = doc.get("type")
        options = doc.get("options") or {}
        try:
            context = await _get_notebook_context(
                doc["notebook_id"], source_ids=options.get("source_ids")
            )
            content = generate_structured_json(
                _build_prompt(artifact_type, context, options),
                system_instruction=_BASE_SYSTEM_INSTRUCTION,
            )
            if artifact_type == "quiz":
                content = _normalize_quiz_content(content)

            await db.db.studio_artifacts.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "content": content,
                        "title": _default_title(artifact_type, content),
                        "status": "ready",
                    },
                    "$unset": {"scheduled_for": "", "error": ""},
                },
            )
            completed += 1
            logger.info("Generated scheduled %s artifact %s.", artifact_type, doc["_id"])
        except Exception as exc:
            logger.error("Scheduled generation failed for %s: %s", doc["_id"], exc)
            await db.db.studio_artifacts.update_one(
                {"_id": doc["_id"]},
                {"$set": {"status": "failed", "error": str(exc)}},
            )

    return completed


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
