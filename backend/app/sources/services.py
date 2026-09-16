import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId

from app.core.database import db
from app.document_processing.document_extraction import extract_text_from_file
from app.document_processing.chunking import create_document_chunks
from app.gemini.embedding_service import generate_embeddings

logger = logging.getLogger(__name__)


def serialize_id(doc: dict) -> dict:
    """Convert MongoDB _id ObjectId to str for Pydantic serialization."""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


async def create_source_record(
    notebook_id: str, filename: str, file_type: str, file_size: int
) -> dict:
    """Create initial source record in MongoDB sources collection."""
    now_iso = datetime.now(timezone.utc).isoformat()
    source_doc = {
        "notebook_id": notebook_id,
        "title": filename,
        "file_type": file_type,
        "file_size": file_size,
        "status": "processing",
        "error_message": None,
        "chunk_count": 0,
        "char_count": 0,
        "is_active": True,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    result = await db.db.sources.insert_one(source_doc)
    source_doc["_id"] = result.inserted_id
    return serialize_id(source_doc)


async def process_document_background(
    source_id: str, notebook_id: str, file_bytes: bytes, file_type: str
):
    """
    Background task: Extract -> Clean -> Chunk -> Generate Embeddings -> Store in MongoDB.
    """
    logger.info("Starting document processing for source %s (%s)...", source_id, file_type)
    try:
        # Step 1: Extract pages/text
        pages = extract_text_from_file(file_bytes, file_type)
        if not pages:
            raise ValueError("No extractable text found in document.")

        # Step 2: Create text chunks
        chunks = create_document_chunks(pages, source_id, notebook_id)
        if not chunks:
            raise ValueError("Document yielded no valid text chunks after processing.")

        # Step 3: Generate vector embeddings for chunks
        chunk_texts = [c["text"] for c in chunks]
        embeddings = generate_embeddings(chunk_texts)
        if len(embeddings) != len(chunks):
            raise ValueError(f"Embedding count mismatch: expected {len(chunks)}, got {len(embeddings)}")

        # Step 4: Attach embeddings to chunks & set timestamps
        now_iso = datetime.now(timezone.utc).isoformat()
        for chunk, embed in zip(chunks, embeddings):
            chunk["embedding"] = embed
            chunk["created_at"] = now_iso

        # Step 5: Store chunks + embeddings in MongoDB document_chunks
        await db.db.document_chunks.insert_many(chunks)

        total_chars = sum(c["char_count"] for c in chunks)

        # Step 6: Update source status to ready
        await db.db.sources.update_one(
            {"_id": ObjectId(source_id)},
            {
                "$set": {
                    "status": "ready",
                    "chunk_count": len(chunks),
                    "char_count": total_chars,
                    "updated_at": now_iso,
                }
            },
        )
        await _invalidate_notebook_summary(notebook_id)
        logger.info(
            "Successfully processed source %s with %d chunks & embeddings (%d chars).",
            source_id,
            len(chunks),
            total_chars,
        )
    except Exception as exc:
        logger.error("Failed to process document for source %s: %s", source_id, exc)
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.db.sources.update_one(
            {"_id": ObjectId(source_id)},
            {
                "$set": {
                    "status": "failed",
                    "error_message": str(exc),
                    "updated_at": now_iso,
                }
            },
        )


async def list_notebook_sources(notebook_id: str) -> List[dict]:
    """Retrieve all sources belonging to a specific notebook."""
    cursor = db.db.sources.find({"notebook_id": notebook_id}).sort("created_at", -1)
    sources = []
    async for doc in cursor:
        sources.append(serialize_id(doc))
    return sources


async def get_source_by_id(source_id: str) -> Optional[dict]:
    """Get single source metadata by ID."""
    try:
        doc = await db.db.sources.find_one({"_id": ObjectId(source_id)})
        return serialize_id(doc) if doc else None
    except Exception:
        return None


async def get_source_chunks(source_id: str) -> List[dict]:
    """Get all document chunks for a source ordered by chunk_index."""
    cursor = db.db.document_chunks.find({"source_id": source_id}).sort("chunk_index", 1)
    chunks = []
    async for doc in cursor:
        chunks.append(serialize_id(doc))
    return chunks


async def delete_source_and_chunks(source_id: str, notebook_id: str) -> bool:
    """Delete a source and all associated document chunks from MongoDB."""
    try:
        source_obj_id = ObjectId(source_id)
        res = await db.db.sources.delete_one({"_id": source_obj_id, "notebook_id": notebook_id})
        if res.deleted_count == 0:
            return False

        await db.db.document_chunks.delete_many({"source_id": source_id})
        await _invalidate_notebook_summary(notebook_id)
        logger.info("Deleted source %s and all associated chunks.", source_id)
        return True
    except Exception as exc:
        logger.error("Error deleting source %s: %s", source_id, exc)
        return False


async def get_active_source_ids(notebook_id: str) -> Optional[List[str]]:
    """
    Return the list of source_ids currently marked active for a notebook, or
    None if every source is active (the common case) so callers can skip
    filtering entirely.
    """
    total = await db.db.sources.count_documents({"notebook_id": notebook_id})
    active_cursor = db.db.sources.find(
        {"notebook_id": notebook_id, "is_active": {"$ne": False}}, {"_id": 1}
    )
    active_ids = [str(doc["_id"]) async for doc in active_cursor]
    if len(active_ids) == total:
        return None
    return active_ids


async def set_source_active(source_id: str, notebook_id: str, is_active: bool) -> Optional[dict]:
    """Toggle whether a source is included in chat/studio generation context."""
    try:
        source_obj_id = ObjectId(source_id)
    except Exception:
        return None

    source = await db.db.sources.find_one({"_id": source_obj_id, "notebook_id": notebook_id})
    if not source:
        return None

    await db.db.sources.update_one({"_id": source_obj_id}, {"$set": {"is_active": is_active}})
    await _invalidate_notebook_summary(notebook_id)
    return await get_source_by_id(source_id)


async def set_all_sources_active(notebook_id: str, is_active: bool) -> List[dict]:
    """Set the active flag for every source in a notebook (Select all / none)."""
    await db.db.sources.update_many(
        {"notebook_id": notebook_id}, {"$set": {"is_active": is_active}}
    )
    await _invalidate_notebook_summary(notebook_id)
    return await list_notebook_sources(notebook_id)


async def _invalidate_notebook_summary(notebook_id: str) -> None:
    """Clear the cached auto-summary so it regenerates next time it's requested."""
    from app.notebooks.services import clear_notebook_summary_cache

    await clear_notebook_summary_cache(notebook_id)
