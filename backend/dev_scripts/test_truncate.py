import asyncio
from dotenv import load_dotenv
load_dotenv()
from app.core.database import connect_to_mongo, db
from app.rag.vector_search_service import search_notebook_chunks, cosine_similarity
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os

async def main():
    await connect_to_mongo()
    
    chunk = await db.db.document_chunks.find_one({})
    if not chunk:
        print("No chunks found in DB")
        return
        
    notebook_id = chunk["notebook_id"]
    
    # 1. Generate 3072 vector
    embedder = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        task_type="retrieval_query"
    )
    query_vector_3072 = embedder.embed_query("who am i")
    
    # TRUNCATE to 768
    query_vector = query_vector_3072[:768]
    
    # Check similarity with existing 768 dim chunks
    all_chunks = await db.db.document_chunks.find({"notebook_id": notebook_id}).to_list(length=1000)
    for c in all_chunks:
        v2 = c.get("embedding", [])
        if not v2 or len(v2) != 768:
            c["sim"] = 0.0
            continue
            
        c["sim"] = cosine_similarity(query_vector, v2)
        
    all_chunks.sort(key=lambda x: x["sim"], reverse=True)
    
    print("\n--- TOP 5 CHUNKS ---")
    for i, c in enumerate(all_chunks[:5]):
        text_preview = c["text"][:60].replace("\n", " ")
        print(f"Rank {i+1} | Score: {c['sim']:.4f} | Text: {text_preview}...")
        
    print("\n--- FINDING 'bhavika' CHUNK ---")
    for i, c in enumerate(all_chunks):
        if "bhavika" in c["text"].lower():
            text_preview = c["text"][:60].replace("\n", " ")
            print(f"Found at Rank {i+1} | Score: {c['sim']:.4f} | Text: {text_preview}...")

if __name__ == "__main__":
    asyncio.run(main())
