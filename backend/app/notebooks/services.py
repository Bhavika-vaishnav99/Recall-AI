import logging
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId

from app.core.database import db
from app.gemini.gemini_service import generate_structured_json

logger = logging.getLogger(__name__)

SUMMARY_MAX_CONTEXT_CHARS = 12000

_SUMMARY_SYSTEM_INSTRUCTION = (
    "You are Recall AI's notebook summarizer. Base your output strictly on the "
    "SOURCE MATERIAL provided, with no outside knowledge. Respond with JSON "
    "only, no markdown fences or extra commentary."
)


async def _backfill_untracked_notebooks() -> None:
    """
    Older data may reference a notebook_id in `sources` that has no matching
    document in the `notebooks` collection (notebooks were introduced after
    sources/chat existed). Create a placeholder notebook record for any such
    orphaned notebook_id so it shows up in the notebook list.
    """
    known_ids = {doc["_id"] async for doc in db.db.notebooks.find({}, {"_id": 1})}
    # notebook_id fields are stored as plain strings, but our notebook _id is
    # an ObjectId. A "known" notebook_id must match str(ObjectId) to be linked.
    known_id_strs = {str(_id) for _id in known_ids}

    source_notebook_ids = await db.db.sources.distinct("notebook_id")
    orphaned = [nid for nid in source_notebook_ids if nid and nid not in known_id_strs]

    for notebook_id in orphaned:
        first_source = await db.db.sources.find_one(
            {"notebook_id": notebook_id}, sort=[("created_at", 1)]
        )
        created_at = (first_source or {}).get("created_at") or datetime.now(timezone.utc).isoformat()
        try:
            obj_id = ObjectId(notebook_id)
        except Exception:
            # Legacy non-ObjectId notebook ids (e.g. "default_notebook_1") can't be
            # used as the notebooks collection's _id; store the literal id instead.
            existing = await db.db.notebooks.find_one({"legacy_id": notebook_id})
            if existing:
                continue
            await db.db.notebooks.insert_one({
                "legacy_id": notebook_id,
                "title": "Untitled notebook",
                "created_at": created_at,
                "updated_at": created_at,
            })
            continue

        await db.db.notebooks.update_one(
            {"_id": obj_id},
            {
                "$setOnInsert": {
                    "title": "Untitled notebook",
                    "created_at": created_at,
                    "updated_at": created_at,
                }
            },
            upsert=True,
        )


def _notebook_id_str(doc: dict) -> str:
    return doc.get("legacy_id") or str(doc["_id"])


async def _build_notebook_response(doc: dict) -> dict:
    notebook_id = _notebook_id_str(doc)
    source_count = await db.db.sources.count_documents({"notebook_id": notebook_id})
    return {
        "id": notebook_id,
        "title": doc.get("title", "Untitled notebook"),
        "source_count": source_count,
        "cover_image": doc.get("cover_image"),
        "use_custom_summary": doc.get("use_custom_summary", False),
        "custom_summary_text": doc.get("custom_summary_text"),
        "created_at": doc.get("created_at", ""),
        "updated_at": doc.get("updated_at", ""),
    }


async def create_notebook(title: Optional[str] = None) -> dict:
    """Create a new notebook workspace."""
    now_iso = datetime.now(timezone.utc).isoformat()
    notebook_doc = {
        "title": (title or "Untitled notebook").strip() or "Untitled notebook",
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    result = await db.db.notebooks.insert_one(notebook_doc)
    notebook_doc["_id"] = result.inserted_id
    return await _build_notebook_response(notebook_doc)


async def list_notebooks() -> List[dict]:
    """List all notebooks, most recently updated first, with source counts."""
    await _backfill_untracked_notebooks()

    notebooks = []
    cursor = db.db.notebooks.find({}).sort("updated_at", -1)
    async for doc in cursor:
        notebooks.append(await _build_notebook_response(doc))
    return notebooks


async def _find_notebook_doc(notebook_id: str) -> Optional[dict]:
    try:
        doc = await db.db.notebooks.find_one({"_id": ObjectId(notebook_id)})
        if doc:
            return doc
    except Exception:
        pass
    return await db.db.notebooks.find_one({"legacy_id": notebook_id})


async def get_notebook(notebook_id: str) -> Optional[dict]:
    doc = await _find_notebook_doc(notebook_id)
    if not doc:
        return None
    return await _build_notebook_response(doc)


async def rename_notebook(notebook_id: str, title: str) -> Optional[dict]:
    doc = await _find_notebook_doc(notebook_id)
    if not doc:
        return None

    now_iso = datetime.now(timezone.utc).isoformat()
    clean_title = title.strip() or "Untitled notebook"
    await db.db.notebooks.update_one(
        {"_id": doc["_id"]},
        {"$set": {"title": clean_title, "updated_at": now_iso}},
    )
    return await get_notebook(notebook_id)


MAX_COVER_IMAGE_CHARS = 3_000_000  # ~2.2MB binary, base64-encoded


async def customize_notebook(
    notebook_id: str,
    title: Optional[str] = None,
    cover_image: Optional[str] = None,
    use_custom_summary: Optional[bool] = None,
    custom_summary_text: Optional[str] = None,
) -> Optional[dict]:
    """Update a notebook's title, cover image, and/or custom-summary settings."""
    doc = await _find_notebook_doc(notebook_id)
    if not doc:
        return None

    updates: dict = {}
    unsets: dict = {}

    if title is not None:
        updates["title"] = title.strip() or "Untitled notebook"
    if cover_image is not None:
        if cover_image == "":
            unsets["cover_image"] = ""
        elif len(cover_image) <= MAX_COVER_IMAGE_CHARS:
            updates["cover_image"] = cover_image
        else:
            raise ValueError("Cover image is too large (max ~2MB).")
    if use_custom_summary is not None:
        updates["use_custom_summary"] = use_custom_summary
    if custom_summary_text is not None:
        updates["custom_summary_text"] = custom_summary_text

    if not updates and not unsets:
        return await get_notebook(notebook_id)

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_op: dict = {"$set": updates}
    if unsets:
        update_op["$unset"] = unsets

    await db.db.notebooks.update_one({"_id": doc["_id"]}, update_op)
    return await get_notebook(notebook_id)


async def delete_notebook(notebook_id: str) -> bool:
    """Delete a notebook and cascade-delete all of its owned data."""
    doc = await _find_notebook_doc(notebook_id)
    if not doc:
        return False

    await db.db.notebooks.delete_one({"_id": doc["_id"]})

    source_ids = [
        str(s["_id"])
        async for s in db.db.sources.find({"notebook_id": notebook_id}, {"_id": 1})
    ]
    await db.db.sources.delete_many({"notebook_id": notebook_id})
    await db.db.document_chunks.delete_many({"notebook_id": notebook_id})

    conversation_ids = [
        str(c["_id"])
        async for c in db.db.conversations.find({"notebook_id": notebook_id}, {"_id": 1})
    ]
    await db.db.conversations.delete_many({"notebook_id": notebook_id})
    if conversation_ids:
        await db.db.messages.delete_many({"conversation_id": {"$in": conversation_ids}})

    await db.db.studio_artifacts.delete_many({"notebook_id": notebook_id})
    await db.db.notes.delete_many({"notebook_id": notebook_id})

    logger.info(
        "Deleted notebook %s (%d sources, %d conversations).",
        notebook_id, len(source_ids), len(conversation_ids),
    )
    return True


async def _gather_context_for_summary(notebook_id: str) -> Optional[str]:
    from app.sources.services import get_active_source_ids

    chunk_filter: dict = {"notebook_id": notebook_id}
    active_source_ids = await get_active_source_ids(notebook_id)
    if active_source_ids is not None:
        if not active_source_ids:
            return None
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
        if total_chars + len(text) > SUMMARY_MAX_CONTEXT_CHARS:
            remaining = SUMMARY_MAX_CONTEXT_CHARS - total_chars
            if remaining > 200:
                parts.append(text[:remaining])
            break
        parts.append(text)
        total_chars += len(text)

    return "\n\n".join(parts) if parts else None


async def get_or_generate_notebook_summary(notebook_id: str, force: bool = False) -> Optional[dict]:
    """
    Return the notebook's cached auto-summary, generating and caching one
    from its active sources' content if none exists yet. Returns None if the
    notebook has no processed/active source content to summarize.
    """
    doc = await _find_notebook_doc(notebook_id)
    if not doc:
        return None

    if doc.get("use_custom_summary") and doc.get("custom_summary_text"):
        return {
            "title": doc.get("title", "Untitled notebook"),
            "summary": doc["custom_summary_text"],
            "generated_at": doc.get("updated_at", datetime.now(timezone.utc).isoformat()),
        }

    if not force and doc.get("summary"):
        return doc["summary"]

    context = await _gather_context_for_summary(notebook_id)
    if not context:
        return None

    prompt = (
        "SOURCE MATERIAL:\n" + context + "\n\n"
        "Write a short overview of this notebook's source material for someone "
        "who hasn't seen it yet: a concise title (3-8 words) and a 3-5 sentence "
        "summary paragraph. Bold the 4-8 most important key terms or phrases in "
        "the summary using **double asterisks**.\n"
        'Respond with JSON: {"title": string, "summary": string}'
    )

    try:
        result = generate_structured_json(prompt, system_instruction=_SUMMARY_SYSTEM_INSTRUCTION)
    except Exception as exc:
        logger.warning("Notebook summary generation failed for %s: %s", notebook_id, exc)
        return None

    summary_doc = {
        "title": result.get("title", ""),
        "summary": result.get("summary", ""),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.db.notebooks.update_one({"_id": doc["_id"]}, {"$set": {"summary": summary_doc}})
    return summary_doc


async def clear_notebook_summary_cache(notebook_id: str) -> None:
    """Invalidate a notebook's cached auto-summary so it regenerates on next request."""
    doc = await _find_notebook_doc(notebook_id)
    if doc:
        await db.db.notebooks.update_one({"_id": doc["_id"]}, {"$unset": {"summary": ""}})
