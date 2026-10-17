import logging
from typing import List
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    HTTPException,
    BackgroundTasks,
    Path,
)

from app.auth.dependencies import get_current_user
from app.document_processing.file_validation import validate_file, get_file_type
from app.notebooks.services import notebook_owned_by
from app.sources.models import (
    SourceResponse,
    SourceDetailResponse,
    SourceActiveUpdateRequest,
    SelectAllSourcesRequest,
)
from app.sources.services import (
    create_source_record,
    process_document_background,
    list_notebook_sources,
    get_source_by_id,
    get_source_chunks,
    delete_source_and_chunks,
    set_source_active,
    set_all_sources_active,
)

logger = logging.getLogger(__name__)

router = APIRouter()


async def _require_notebook_owner(notebook_id: str, current_user: dict) -> None:
    if not await notebook_owned_by(notebook_id, str(current_user["_id"])):
        raise HTTPException(status_code=404, detail="Notebook not found")


@router.post(
    "/notebooks/{notebook_id}/sources/upload",
    response_model=SourceResponse,
    status_code=202,
    summary="Upload a document source (PDF, TXT, DOCX, MD)",
)
async def upload_source(
    background_tasks: BackgroundTasks,
    notebook_id: str = Path(..., description="ID of the target notebook workspace"),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a document file to be parsed, cleaned, chunked, and stored.
    Supported types: PDF, TXT, DOCX, MD.
    """
    await _require_notebook_owner(notebook_id, current_user)

    file_bytes = await file.read()
    file_size = len(file_bytes)
    filename = file.filename or "file"

    # Step 1: Validate file extension & size
    is_valid, err_msg = validate_file(filename, file_size)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    file_type = get_file_type(filename)

    # Step 2: Create initial source record in MongoDB
    source_record = await create_source_record(
        notebook_id=notebook_id,
        filename=filename,
        file_type=file_type,
        file_size=file_size,
    )

    # Step 3: Trigger background document processing & chunking
    background_tasks.add_task(
        process_document_background,
        source_id=source_record["id"],
        notebook_id=notebook_id,
        file_bytes=file_bytes,
        file_type=file_type,
    )

    return source_record


@router.get(
    "/notebooks/{notebook_id}/sources",
    response_model=List[SourceResponse],
    summary="List all sources in a notebook",
)
async def list_sources(
    notebook_id: str = Path(..., description="ID of the notebook workspace"),
    current_user: dict = Depends(get_current_user),
):
    """Retrieve all document sources associated with a notebook."""
    await _require_notebook_owner(notebook_id, current_user)
    return await list_notebook_sources(notebook_id)


@router.get(
    "/sources/{source_id}",
    response_model=SourceDetailResponse,
    summary="Get source details and document chunks",
)
async def get_source_detail(
    source_id: str = Path(..., description="ID of the source document"),
    current_user: dict = Depends(get_current_user),
):
    """Retrieve metadata and extracted document text chunks for a single source."""
    source = await get_source_by_id(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source document not found")
    await _require_notebook_owner(source["notebook_id"], current_user)

    chunks = await get_source_chunks(source_id)
    return {"source": source, "chunks": chunks}


@router.patch(
    "/notebooks/{notebook_id}/sources/select-all",
    response_model=List[SourceResponse],
    summary="Set the active flag for every source in a notebook",
)
async def select_all_sources(
    request: SelectAllSourcesRequest,
    notebook_id: str = Path(..., description="ID of the notebook workspace"),
    current_user: dict = Depends(get_current_user),
):
    """Toggle whether all sources in the notebook are included in chat/studio generation."""
    await _require_notebook_owner(notebook_id, current_user)
    return await set_all_sources_active(notebook_id, request.is_active)


@router.patch(
    "/notebooks/{notebook_id}/sources/{source_id}/active",
    response_model=SourceResponse,
    summary="Set whether a source is included in chat/studio generation",
)
async def update_source_active(
    request: SourceActiveUpdateRequest,
    notebook_id: str = Path(..., description="ID of the notebook workspace"),
    source_id: str = Path(..., description="ID of the source to update"),
    current_user: dict = Depends(get_current_user),
):
    await _require_notebook_owner(notebook_id, current_user)
    source = await set_source_active(source_id, notebook_id, request.is_active)
    if not source:
        raise HTTPException(status_code=404, detail="Source document not found")
    return source


@router.delete(
    "/notebooks/{notebook_id}/sources/{source_id}",
    summary="Delete a source and all associated document chunks",
)
async def delete_source(
    notebook_id: str = Path(..., description="ID of the notebook workspace"),
    source_id: str = Path(..., description="ID of the source to delete"),
    current_user: dict = Depends(get_current_user),
):
    """Delete a source document and its extracted chunks from MongoDB."""
    await _require_notebook_owner(notebook_id, current_user)
    success = await delete_source_and_chunks(source_id=source_id, notebook_id=notebook_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Source document not found or could not be deleted",
        )
    return {"status": "success", "message": "Source document deleted successfully"}
