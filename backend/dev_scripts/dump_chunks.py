import asyncio
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]
    chunks = await db.document_chunks.find().to_list(length=10)
    for c in chunks:
        print(f"Chunk text: {c.get('text', '')[:200]}...")

asyncio.run(main())
