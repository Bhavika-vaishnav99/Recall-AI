from google import genai
import os
from dotenv import load_dotenv
load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

response = client.models.embed_content(
    model='text-embedding-004',
    contents='hello world',
)
print("Output length:", len(response.embeddings[0].values))
