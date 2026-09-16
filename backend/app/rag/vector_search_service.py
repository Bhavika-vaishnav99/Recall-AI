import logging
import math
from typing import List, Dict, Any
from bson import ObjectId

from app.core.database import db
from app.gemini.embedding_service import generate_query_embedding
from app.sources.services import serialize_id, get_active_source_ids

logger = logging.getLogger(__name__)


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two vector float lists."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0

    dot_product = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))

    if mag1 == 0 or mag2 == 0:
        return 0.0

    return max(0.0, min(1.0, dot_product / (mag1 * mag2)))


async def search_notebook_chunks(
    notebook_id: str, query: str, top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Search document chunks within a notebook using semantic vector similarity.
    Enforces strict filtering by notebook_id.
    """
    if not query.strip():
        return []

    # Step 1: Generate embedding for query string
    query_vector = generate_query_embedding(query)

    # Only chunks belonging to active (checked) sources are searchable.
    # None means every source is active, so no filter is needed.
    active_source_ids = await get_active_source_ids(notebook_id)
    if active_source_ids is not None and not active_source_ids:
        return []

    results: List[Dict[str, Any]] = []

    # Step 2: Try MongoDB Atlas $vectorSearch pipeline if running on live MongoDB Atlas
    if db.client and not db.is_mock:
        try:
            vector_filter: Dict[str, Any] = {"notebook_id": notebook_id}
            if active_source_ids is not None:
                vector_filter["source_id"] = {"$in": active_source_ids}
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "vector_index",
                        "path": "embedding",
                        "queryVector": query_vector,
                        "numCandidates": max(top_k * 10, 20),
                        "limit": top_k,
                        "filter": vector_filter,
                    }
                },
                {
                    "$project": {
                        "source_id": 1,
                        "notebook_id": 1,
                        "chunk_index": 1,
                        "page_number": 1,
                        "text": 1,
                        "char_count": 1,
                        "similarity_score": {"$meta": "vectorSearchScore"},
                    }
                },
            ]
            cursor = db.db.document_chunks.aggregate(pipeline)
            async for doc in cursor:
                doc = serialize_id(doc)
                results.append(doc)
        except Exception as exc:
            logger.info("Atlas $vectorSearch pipeline skipped/note: %s. Using in-memory vector similarity match.", exc)
            results = []

    # Step 3: Python-level cosine similarity fallback if $vectorSearch is not supported/configured
    if not results:
        fallback_filter: Dict[str, Any] = {"notebook_id": notebook_id}
        if active_source_ids is not None:
            fallback_filter["source_id"] = {"$in": active_source_ids}
        cursor = db.db.document_chunks.find(fallback_filter)
        candidates = []
        async for doc in cursor:
            chunk_doc = serialize_id(doc)
            chunk_vector = chunk_doc.get("embedding", [])
            if chunk_vector:
                score = cosine_similarity(query_vector, chunk_vector)
                chunk_doc["similarity_score"] = round(score, 4)
                candidates.append(chunk_doc)

        # Sort candidates by similarity score descending
        candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
        results = candidates[:top_k]

    # Step 4: Enrich results with source title metadata
    source_cache: Dict[str, str] = {}
    enriched_results = []
    for item in results:
        source_id = item.get("source_id")
        source_title = "Unknown Source"

        if source_id:
            if source_id in source_cache:
                source_title = source_cache[source_id]
            else:
                try:
                    source_doc = await db.db.sources.find_one({"_id": ObjectId(source_id)})
                    if source_doc and "title" in source_doc:
                        source_title = source_doc["title"]
                        source_cache[source_id] = source_title
                except Exception:
                    pass

        enriched_results.append({
            "chunk_id": item.get("id", ""),
            "source_id": source_id,
            "source_title": source_title,
            "notebook_id": item.get("notebook_id"),
            "chunk_index": item.get("chunk_index"),
            "page_number": item.get("page_number", 1),
            "similarity_score": item.get("similarity_score", 0.0),
            "char_count": item.get("char_count", len(item.get("text", ""))),
            "text": item.get("text", ""),
        })

    return enriched_results
