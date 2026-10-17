import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query

from app.auth.dependencies import get_current_user
from app.notebooks.models import (
    NotebookCreateRequest,
    NotebookRenameRequest,
    NotebookCustomizeRequest,
    NotebookResponse,
    NotebookSummaryResponse,
)
from app.notebooks.services import (
    create_notebook,
    list_notebooks,
    get_notebook,
    rename_notebook,
    customize_notebook,
    delete_notebook,
    get_or_generate_notebook_summary,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/notebooks", response_model=NotebookResponse, status_code=201, summary="Create a new notebook")
async def create_notebook_route(request: NotebookCreateRequest, current_user: dict = Depends(get_current_user)):
    return await create_notebook(user_id=str(current_user["_id"]), title=request.title)


@router.get("/notebooks", response_model=List[NotebookResponse], summary="List all notebooks")
async def list_notebooks_route(current_user: dict = Depends(get_current_user)):
    return await list_notebooks(user_id=str(current_user["_id"]))


@router.get("/notebooks/{notebook_id}", response_model=NotebookResponse, summary="Get a notebook's metadata")
async def get_notebook_route(notebook_id: str = Path(...), current_user: dict = Depends(get_current_user)):
    notebook = await get_notebook(notebook_id, str(current_user["_id"]))
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook


@router.patch("/notebooks/{notebook_id}", response_model=NotebookResponse, summary="Rename a notebook")
async def rename_notebook_route(
    request: NotebookRenameRequest,
    notebook_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    notebook = await rename_notebook(notebook_id, str(current_user["_id"]), request.title)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook


@router.patch(
    "/notebooks/{notebook_id}/customize",
    response_model=NotebookResponse,
    summary="Update a notebook's title, cover image, and custom-summary settings",
)
async def customize_notebook_route(
    request: NotebookCustomizeRequest,
    notebook_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        notebook = await customize_notebook(
            notebook_id,
            str(current_user["_id"]),
            title=request.title,
            cover_image=request.cover_image,
            use_custom_summary=request.use_custom_summary,
            custom_summary_text=request.custom_summary_text,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook


@router.get(
    "/notebooks/{notebook_id}/summary",
    response_model=Optional[NotebookSummaryResponse],
    summary="Get (or lazily generate) a notebook's auto-summary",
)
async def get_notebook_summary_route(
    notebook_id: str = Path(...),
    force: bool = Query(False, description="Regenerate even if a cached summary exists"),
    current_user: dict = Depends(get_current_user),
):
    return await get_or_generate_notebook_summary(notebook_id, str(current_user["_id"]), force=force)


@router.delete("/notebooks/{notebook_id}", summary="Delete a notebook and all of its data")
async def delete_notebook_route(notebook_id: str = Path(...), current_user: dict = Depends(get_current_user)):
    success = await delete_notebook(notebook_id, str(current_user["_id"]))
    if not success:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return {"status": "success", "message": "Notebook deleted successfully"}
