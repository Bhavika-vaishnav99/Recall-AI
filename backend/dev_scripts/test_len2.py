from dotenv import load_dotenv
load_dotenv()
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os

for model_name in ["text-embedding-004"]:
    embeddings_model_doc = GoogleGenerativeAIEmbeddings(
        model=model_name,
        google_api_key=os.getenv("GEMINI_API_KEY"),
        task_type="retrieval_document"
    )
    docs = embeddings_model_doc.embed_documents(["hello world"])
    print(f"{model_name} length: {len(docs[0])}")

