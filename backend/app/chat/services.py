import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId

from app.core.database import db
from app.sources.services import serialize_id

logger = logging.getLogger(__name__)


async def get_or_create_conversation(
    notebook_id: str, conversation_id: Optional[str] = None, initial_title: str = "New Chat"
) -> dict:
    """Get an existing conversation or create a new one for a notebook."""
    now_iso = datetime.now(timezone.utc).isoformat()

    if conversation_id:
        try:
            doc = await db.db.conversations.find_one(
                {"_id": ObjectId(conversation_id), "notebook_id": notebook_id}
            )
            if doc:
                return serialize_id(doc)
        except Exception:
            pass

    # Create new conversation record
    title = initial_title[:40] if initial_title else "New Chat"
    conv_doc = {
        "notebook_id": notebook_id,
        "title": title,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    res = await db.db.conversations.insert_one(conv_doc)
    conv_doc["_id"] = res.inserted_id
    return serialize_id(conv_doc)


async def save_chat_message(
    conversation_id: str,
    notebook_id: str,
    role: str,
    content: str,
    citations: Optional[List[dict]] = None,
    sources_used: Optional[List[str]] = None,
) -> dict:
    """Save a user or assistant chat message to MongoDB."""
    now_iso = datetime.now(timezone.utc).isoformat()
    msg_doc = {
        "conversation_id": conversation_id,
        "notebook_id": notebook_id,
        "role": role,
        "content": content,
        "citations": citations or [],
        "sources_used": sources_used or [],
        "created_at": now_iso,
    }
    res = await db.db.messages.insert_one(msg_doc)
    msg_doc["_id"] = res.inserted_id

    # Update conversation updated_at
    try:
        await db.db.conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"updated_at": now_iso}},
        )
    except Exception:
        pass

    return serialize_id(msg_doc)


async def get_recent_conversation_messages(
    conversation_id: str, limit: int = 6
) -> List[dict]:
    """Retrieve recent messages for context building."""
    cursor = (
        db.db.messages.find({"conversation_id": conversation_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    msgs = []
    async for doc in cursor:
        msgs.append(serialize_id(doc))
    
    # Reverse to return in chronological order (oldest to newest)
    msgs.reverse()
    return msgs


async def list_notebook_conversations(notebook_id: str) -> List[dict]:
    """List all chat conversations for a notebook."""
    cursor = db.db.conversations.find({"notebook_id": notebook_id}).sort("updated_at", -1)
    convs = []
    async for doc in cursor:
        convs.append(serialize_id(doc))
    return convs
