from fastapi import APIRouter
from app.api.v1 import health
from app.auth import router as auth_router
from app.notebooks import router as notebooks_router
from app.sources import router as sources_router
from app.rag import router as rag_router
from app.chat import router as chat_router
from app.studio import router as studio_router
from app.notes import router as notes_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth_router.router)
api_router.include_router(notebooks_router.router)
api_router.include_router(sources_router.router)
api_router.include_router(rag_router.router)
api_router.include_router(chat_router.router)
api_router.include_router(studio_router.router)
api_router.include_router(notes_router.router)
