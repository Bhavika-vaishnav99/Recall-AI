import logging
from typing import List, Optional
from fastapi import APIRouter, Path, HTTPException
from pydantic import BaseModel, Field

from app.rag.vector_search_service import search_notebook_chunks

logger = logging.getLogger(__name__)

router = APIRouter()


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query string")
    top_k: int = Field(5, ge=1, le=50, description="Maximum number of relevant chunks to retrieve")


class SearchResultItem(BaseModel):
    chunk_id: str
    source_id: Optional[str] = None
    source_title: str
    notebook_id: str
    chunk_index: Optional[int] = 0
    page_number: Optional[int] = 1
    similarity_score: float
    char_count: int
    text: str


class SearchResponse(BaseModel):
    query: str
    notebook_id: str
    total_results: int
    results: List[SearchResultItem]


@router.post(
    "/notebooks/{notebook_id}/search",
    response_model=SearchResponse,
    summary="Semantic vector search for notebook document chunks",
)
async def search_notebook(
    request: SearchRequest,
    notebook_id: str = Path(..., description="ID of the notebook workspace"),
):
    """
    Search notebook document chunks using vector embeddings.
    Filtered strictly by notebook_id to preserve workspace isolation.
    """
    try:
        results = await search_notebook_chunks(
            notebook_id=notebook_id,
            query=request.query,
            top_k=request.top_k,
        )
        return {
            "query": request.query,
            "notebook_id": notebook_id,
            "total_results": len(results),
            "results": results,
        }
    except Exception as exc:
        logger.error("Vector search failed for notebook %s: %s", notebook_id, exc)
        raise HTTPException(status_code=500, detail=f"Vector search execution error: {str(exc)}")
