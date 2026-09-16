import logging
from typing import Optional, Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from mongomock_motor import AsyncMongoMockClient
from app.core.config import settings

logger = logging.getLogger(__name__)


class Database:
    client: Optional[Any] = None
    db: Optional[Any] = None
    is_mock: bool = False


db = Database()


async def connect_to_mongo():
    """Establish async MongoDB connection with automatic local in-memory fallback."""
    logger.info("Connecting to MongoDB at %s...", settings.MONGO_URI)
    try:
        real_client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=1500,
        )
        # Server ping check
        await real_client.admin.command("ping")
        db.client = real_client
        db.db = real_client[settings.MONGO_DB_NAME]
        db.is_mock = False
        logger.info("Successfully connected to live MongoDB database: %s", settings.MONGO_DB_NAME)
    except Exception as exc:
        logger.info("Live MongoDB server not reached (%s). Initializing in-memory MongoMock engine.", exc)
        mock_client = AsyncMongoMockClient()
        db.client = mock_client
        db.db = mock_client[settings.MONGO_DB_NAME]
        db.is_mock = True
        logger.info("In-memory MongoDB engine initialized for database: %s", settings.MONGO_DB_NAME)


async def close_mongo_connection():
    """Close MongoDB connection."""
    if db.client and not db.is_mock:
        logger.info("Closing MongoDB connection...")
        db.client.close()
        logger.info("MongoDB connection closed.")


async def get_database_status() -> dict:
    """Check MongoDB health status."""
    if db.client is None:
        return {"status": "disconnected", "details": "Database client not initialized"}
    if db.is_mock:
        return {
            "status": "connected",
            "mode": "in_memory_mock",
            "database": settings.MONGO_DB_NAME,
        }
    try:
        await db.client.admin.command("ping")
        return {
            "status": "connected",
            "mode": "live_mongodb",
            "database": settings.MONGO_DB_NAME,
        }
    except Exception as exc:
        return {"status": "disconnected", "details": str(exc)}
