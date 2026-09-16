import asyncio
from app.core.database import db, connect_to_mongo

async def main():
    await connect_to_mongo()
    chunk = await db.db.document_chunks.find_one()
    print("Has embedding?", "embedding" in chunk)
    if "embedding" in chunk:
        print("Embedding length:", len(chunk["embedding"]))
        
    chunk_bhavika = await db.db.document_chunks.find_one({"text": {"$regex": "bhavika", "$options": "i"}})
    if chunk_bhavika:
        print("Bhavika text length:", len(chunk_bhavika.get("text", "")))
        print("Bhavika chunk text:", chunk_bhavika.get("text")[:200])

asyncio.run(main())
