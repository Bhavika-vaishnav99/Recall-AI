import asyncio
from app.core.database import db, connect_to_mongo
from app.gemini.embedding_service import generate_embeddings

async def main():
    await connect_to_mongo()
    
    chunks = await db.db.document_chunks.find().to_list(length=1000)
    print(f"Found {len(chunks)} chunks to re-embed.")
    
    texts = [c["text"] for c in chunks]
    print("Generating embeddings...")
    embeddings = generate_embeddings(texts)
    
    print("Updating database...")
    for i, c in enumerate(chunks):
        if i < len(embeddings):
            await db.db.document_chunks.update_one(
                {"_id": c["_id"]},
                {"$set": {"embedding": embeddings[i]}}
            )
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
