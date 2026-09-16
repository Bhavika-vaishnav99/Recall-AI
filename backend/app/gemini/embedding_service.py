import logging
import math
import hashlib
from typing import List

from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_embeddings(texts: List[str], batch_size: int = 50) -> List[List[float]]:
    """
    Generate vector embeddings for a list of document chunk texts.
    Processes in batches using LangChain's Gemini embedding model.
    """
    if not texts:
        return []

    # If GEMINI_API_KEY is configured, try live Gemini embeddings
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
        try:
            embeddings_model = GoogleGenerativeAIEmbeddings(
                model="models/gemini-embedding-001",
                google_api_key=settings.GEMINI_API_KEY,
                task_type="retrieval_document"
            )
            
            logger.info("Generating Gemini embeddings for %d texts...", len(texts))
            # LangChain handles the batching automatically inside embed_documents
            all_embeddings = embeddings_model.embed_documents(texts)
            
            if len(all_embeddings) == len(texts):
                # Ensure exactly 768 dimensions to match Atlas index
                return [vec[:768] for vec in all_embeddings]
        except Exception as exc:
            logger.warning("Gemini embedding API call failed: %s. Using deterministic local fallback embeddings.", exc)

    # Deterministic fallback embeddings generator
    logger.info("Using local deterministic embedding generator (%d dim)...", settings.EMBEDDING_DIMENSION)
    return [create_local_embedding(text) for text in texts]


def generate_query_embedding(query: str) -> List[float]:
    """Generate vector embedding for a single user search query."""
    if not query.strip():
        return [0.0] * settings.EMBEDDING_DIMENSION

    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
        try:
            embeddings_model = GoogleGenerativeAIEmbeddings(
                model="models/gemini-embedding-001",
                google_api_key=settings.GEMINI_API_KEY,
                task_type="retrieval_query"
            )
            
            embedding = embeddings_model.embed_query(query)
            # Ensure exactly 768 dimensions
            return embedding[:768]
        except Exception as exc:
            logger.warning("Gemini query embedding call failed: %s. Using local fallback.", exc)

    return create_local_embedding(query)


def create_local_embedding(text: str, dim: int = 768) -> List[float]:
    """
    Generate normalized 768-dimensional pseudo-semantic vector from text tokens.
    Uses SHA-256 seed hashing & term frequency for cosine similarity behavior.
    """
    vector = [0.0] * dim
    words = text.lower().split()
    if not words:
        return vector

    for word in words:
        # Hash each word to seed dimensions
        word_bytes = word.encode("utf-8")
        hash_val = int(hashlib.sha256(word_bytes).hexdigest(), 16)
        
        # Populate 4 dimensions per word
        for offset in range(4):
            idx = (hash_val + offset * 13) % dim
            val = ((hash_val >> (offset * 8)) & 0xFF) / 255.0 - 0.5
            vector[idx] += val

    # L2 normalize vector
    magnitude = math.sqrt(sum(v * v for v in vector))
    if magnitude > 0:
        vector = [v / magnitude for v in vector]

    return vector
