import logging
from typing import List
from fastapi import APIRouter, HTTPException, Path

from app.studio.models import StudioGenerateRequest, StudioArtifactResponse
from app.studio.services import (
    generate_studio_artifact,
    schedule_studio_artifact,
    list_studio_artifacts,
    get_studio_artifact,
    delete_studio_artifact,
    NoSourceContentError,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/notebooks/{notebook_id}/studio/generate",
    response_model=StudioArtifactResponse,
    summary="Generate a Studio output (flashcards, quiz, report, slides, or data table)",
)
async def generate_studio_route(
    request: StudioGenerateRequest,
    notebook_id: str = Path(...),
):
    try:
        if request.defer:
            return await schedule_studio_artifact(
                notebook_id, request.type, request.options.model_dump()
            )
        return await generate_studio_artifact(
            notebook_id, request.type, request.options.model_dump()
        )
    except NoSourceContentError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Studio generation error (%s) for notebook %s: %s", request.type, notebook_id, exc)
        raise HTTPException(status_code=500, detail=f"Failed to generate {request.type}: {str(exc)}")


@router.get(
    "/notebooks/{notebook_id}/studio",
    response_model=List[StudioArtifactResponse],
    summary="List generated Studio outputs for a notebook",
)
async def list_studio_route(notebook_id: str = Path(...)):
    return await list_studio_artifacts(notebook_id)


@router.get(
    "/studio/{artifact_id}",
    response_model=StudioArtifactResponse,
    summary="Get a single Studio output",
)
async def get_studio_route(artifact_id: str = Path(...)):
    artifact = await get_studio_artifact(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Studio output not found")
    return artifact


@router.delete("/studio/{artifact_id}", summary="Delete a Studio output")
async def delete_studio_route(artifact_id: str = Path(...)):
    success = await delete_studio_artifact(artifact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Studio output not found")
    return {"status": "success", "message": "Studio output deleted"}
