import logging
from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import settings
from app.gemini.gemini_service import generate_grounded_answer

logger = logging.getLogger(__name__)

# Exact Knowledge Base RAG System Prompt
RAG_SYSTEM_PROMPT = """You are Recall AI, an exact Knowledge Base QA Assistant.

CRITICAL EXTRACTION INSTRUCTIONS:
1. Answer the user's question directly, accurately, and extractively using ONLY the EXACT information found in the RETRIEVED KNOWLEDGE CONTEXT FROM SOURCES.
2. Quote or reference specific facts, figures, definitions, steps, and rules directly from the document excerpts.
3. If the exact answer to the user's question is not found in the context (e.g., if you are asked about information not in the text, or if you are asked "Who am I?" and the context does not contain the answer), you MUST output exactly: "I don't know based on the provided documents." Do not hallucinate or guess.
4. Do NOT make up facts, add outside information, or use your pre-trained knowledge to answer questions.
"""

langchain_prompt_template = ChatPromptTemplate.from_messages([
    ("system", RAG_SYSTEM_PROMPT),
    ("human", """CURRENT NOTEBOOK DOCUMENTS AVAILABLE:
{sources_summary}

RETRIEVED KNOWLEDGE BASE EXCERPTS:
{context}

RECENT CONVERSATION HISTORY:
{history}

USER QUESTION:
{question}

EXACT KNOWLEDGE BASE RESPONSE:"""),
])


def run_langchain_rag_chain(
    question: str,
    context: str,
    sources_summary: str,
    history: str = "None",
) -> str:
    """
    Execute LangChain RAG pipeline to generate exact grounded answer from retrieved context.
    """
    try:
        formatted_messages = langchain_prompt_template.format_messages(
            system_prompt=RAG_SYSTEM_PROMPT,
            sources_summary=sources_summary,
            context=context,
            history=history,
            question=question,
        )
        
        full_prompt_text = "\n\n".join([m.content for m in formatted_messages])

        return generate_grounded_answer(
            prompt_text=full_prompt_text,
            system_instruction=RAG_SYSTEM_PROMPT,
        )
    except Exception as exc:
        logger.error("LangChain RAG chain execution error: %s", exc)
        return generate_grounded_answer(
            prompt_text=f"RETRIEVED KNOWLEDGE BASE EXCERPTS:\n{context}\n\nUSER QUESTION:\n{question}",
            system_instruction=RAG_SYSTEM_PROMPT,
        )
