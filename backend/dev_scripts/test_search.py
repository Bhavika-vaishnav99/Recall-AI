import asyncio
from dotenv import load_dotenv
load_dotenv()
from app.core.database import connect_to_mongo, db
from app.rag.vector_search_service import search_notebook_chunks, cosine_similarity
from app.gemini.embedding_service import generate_query_embedding

async def main():
    await connect_to_mongo()
    
    chunk = await db.db.document_chunks.find_one({})
    if not chunk:
        print("No chunks found in DB")
        return
        
    notebook_id = chunk["notebook_id"]
    print(f"Using notebook_id: {notebook_id}")
    
    # 1. Manually check all similarities
    query_vector = generate_query_embedding("who am i")
    print(f"Query vector length: {len(query_vector)}")
    
    all_chunks = await db.db.document_chunks.find({"notebook_id": notebook_id}).to_list(length=1000)
    if all_chunks:
        print(f"Chunk vector length: {len(all_chunks[0].get('embedding', []))}")
        
    for c in all_chunks:
        v1 = query_vector
        v2 = c.get("embedding", [])
        if not v1 or not v2 or len(v1) != len(v2):
            raw_dot = 0.0
        else:
            dot_product = sum(a * b for a, b in zip(v1, v2))
            mag1 = sum(a * a for a in v1) ** 0.5
            mag2 = sum(b * b for b in v2) ** 0.5
            raw_dot = dot_product / (mag1 * mag2) if (mag1 * mag2) > 0 else 0.0
            
        c["sim"] = cosine_similarity(query_vector, v2)
        c["raw_dot"] = raw_dot
        
    all_chunks.sort(key=lambda x: x["raw_dot"], reverse=True)
    
    print("\n--- TOP 10 CHUNKS ---")
    for i, c in enumerate(all_chunks[:10]):
        text_preview = c["text"][:60].replace("\n", " ")
        print(f"Rank {i+1} | Score: {c['sim']:.4f} | Raw Dot: {c['raw_dot']:.4f} | Text: {text_preview}...")
        
    print("\n--- FINDING 'bhavika' CHUNK ---")
    for i, c in enumerate(all_chunks):
        if "bhavika" in c["text"].lower():
            text_preview = c["text"][:60].replace("\n", " ")
            print(f"Found at Rank {i+1} | Score: {c['sim']:.4f} | Text: {text_preview}...")
    print(f"Using notebook_id: {notebook_id}")
    
    results = await search_notebook_chunks(notebook_id, "who am i", top_k=6)
    
    print("\n--- RETRIEVED CHUNKS ---")
    for r in results:
        print(f"Score: {r['similarity_score']:.4f}")
        print(f"Text: {r['text'][:150]}...\n")
        
    print("\n--- SEARCHING FOR 'bhavika' ---")
    bhavika_chunks = await db.db.document_chunks.find({"text": {"$regex": "bhavika", "$options": "i"}}).to_list(length=10)
    for c in bhavika_chunks:
        print(f"Found chunk with 'bhavika'. Notebook: {c['notebook_id']}")
        print(f"Text: {c['text'][:150]}...\n")

if __name__ == "__main__":
    asyncio.run(main())
