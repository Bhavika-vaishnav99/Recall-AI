from dotenv import load_dotenv
load_dotenv()
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os

try:
    embedder = GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        task_type="retrieval_document"
    )
    docs = embedder.embed_documents(["hello world"])
    print(f"text-embedding-004 length: {len(docs[0])}")
except Exception as e:
    print("Error:", e)
