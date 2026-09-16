from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.core.database import get_database_status

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for API and MongoDB connection monitoring."""
    db_status = await get_database_status()
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
    }
