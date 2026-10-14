import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.api.v1.health import health_check
from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("recall_ai")


SCHEDULED_POLL_SECONDS = 60


async def _scheduled_studio_worker():
    """Periodically run any 'Generate later' studio jobs that are now due."""
    from app.studio.services import run_due_scheduled_artifacts

    while True:
        try:
            await asyncio.sleep(SCHEDULED_POLL_SECONDS)
            await run_due_scheduled_artifacts()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("Scheduled studio worker error: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for FastAPI application."""
    logger.info("Initializing Recall AI Backend Services...")
    await connect_to_mongo()
    worker = asyncio.create_task(_scheduled_studio_worker())
    yield
    logger.info("Shutting down Recall AI Backend Services...")
    worker.cancel()
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Robust CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"http://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Direct root health check route (/api/health)
app.add_api_route("/api/health", health_check, methods=["GET"], tags=["Health"])

# Include versioned API router (/api/v1)
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "health": "/api/health",
    }
