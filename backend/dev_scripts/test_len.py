from dotenv import load_dotenv
load_dotenv()
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os

model_name = "models/gemini-embedding-001"
embeddings_model_doc = GoogleGenerativeAIEmbeddings(
    model=model_name,
    google_api_key=os.getenv("GEMINI_API_KEY"),
    task_type="retrieval_document"
)

embeddings_model_query = GoogleGenerativeAIEmbeddings(
    model=model_name,
    google_api_key=os.getenv("GEMINI_API_KEY"),
    task_type="retrieval_query"
)

docs = embeddings_model_doc.embed_documents(["hello world"])
query = embeddings_model_query.embed_query("hello world")

print(f"Doc length: {len(docs[0])}")
print(f"Query length: {len(query)}")
