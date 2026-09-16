import logging
from typing import List
from fastapi import APIRouter, HTTPException, Path

from app.notes.models import NoteCreateRequest, NoteUpdateRequest, NoteResponse
from app.notes.services import (
    create_note,
    list_notebook_notes,
    get_note,
    update_note,
    delete_note,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/notebooks/{notebook_id}/notes",
    response_model=NoteResponse,
    status_code=201,
    summary="Create a note in a notebook",
)
async def create_note_route(request: NoteCreateRequest, notebook_id: str = Path(...)):
    return await create_note(notebook_id, request.title, request.content)


@router.get(
    "/notebooks/{notebook_id}/notes",
    response_model=List[NoteResponse],
    summary="List all notes in a notebook",
)
async def list_notes_route(notebook_id: str = Path(...)):
    return await list_notebook_notes(notebook_id)


@router.get("/notes/{note_id}", response_model=NoteResponse, summary="Get a single note")
async def get_note_route(note_id: str = Path(...)):
    note = await get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.patch("/notes/{note_id}", response_model=NoteResponse, summary="Update a note")
async def update_note_route(request: NoteUpdateRequest, note_id: str = Path(...)):
    note = await update_note(note_id, request.title, request.content)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.delete("/notes/{note_id}", summary="Delete a note")
async def delete_note_route(note_id: str = Path(...)):
    success = await delete_note(note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"status": "success", "message": "Note deleted"}
