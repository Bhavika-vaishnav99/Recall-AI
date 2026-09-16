import logging
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId

from app.core.database import db
from app.sources.services import serialize_id

logger = logging.getLogger(__name__)


def _default_title(content: str) -> str:
    first_line = content.strip().split("\n", 1)[0].strip()
    if not first_line:
        return "Untitled note"
    return first_line[:60]


async def create_note(notebook_id: str, title: Optional[str], content: str) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    note_doc = {
        "notebook_id": notebook_id,
        "title": (title or "").strip() or _default_title(content),
        "content": content,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    result = await db.db.notes.insert_one(note_doc)
    note_doc["_id"] = result.inserted_id
    return serialize_id(note_doc)


async def list_notebook_notes(notebook_id: str) -> List[dict]:
    cursor = db.db.notes.find({"notebook_id": notebook_id}).sort("updated_at", -1)
    notes = []
    async for doc in cursor:
        notes.append(serialize_id(doc))
    return notes


async def get_note(note_id: str) -> Optional[dict]:
    try:
        doc = await db.db.notes.find_one({"_id": ObjectId(note_id)})
        return serialize_id(doc) if doc else None
    except Exception:
        return None


async def update_note(note_id: str, title: Optional[str], content: Optional[str]) -> Optional[dict]:
    try:
        note_obj_id = ObjectId(note_id)
    except Exception:
        return None

    existing = await db.db.notes.find_one({"_id": note_obj_id})
    if not existing:
        return None

    updates: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if content is not None:
        updates["content"] = content
    if title is not None:
        updates["title"] = title.strip() or _default_title(content if content is not None else existing.get("content", ""))
    elif content is not None and not existing.get("title", "").strip():
        updates["title"] = _default_title(content)

    await db.db.notes.update_one({"_id": note_obj_id}, {"$set": updates})
    return await get_note(note_id)


async def delete_note(note_id: str) -> bool:
    try:
        res = await db.db.notes.delete_one({"_id": ObjectId(note_id)})
        return res.deleted_count > 0
    except Exception:
        return False
