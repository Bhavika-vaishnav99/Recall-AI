import json
import logging
import re
import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)


def init_genai():
    """Configure Gemini SDK if API key is present."""
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)


def generate_structured_json(prompt_text: str, system_instruction: str = "") -> dict:
    """
    Generate a JSON object from Gemini using native JSON response mode.
    Raises RuntimeError if the API is unavailable or the response can't be
    parsed as JSON (callers are expected to surface this as a clear error
    rather than silently returning fabricated content).
    """
    init_genai()

    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        raise RuntimeError("Gemini API key is not configured.")

    model = genai.GenerativeModel(
        model_name=settings.GEMINI_CHAT_MODEL,
        system_instruction=system_instruction if system_instruction else None,
    )
    response = model.generate_content(
        prompt_text,
        generation_config=genai.types.GenerationConfig(
            response_mime_type="application/json",
        ),
    )
    raw_text = (response.text or "").strip() if response else ""
    if not raw_text:
        raise RuntimeError("Gemini returned an empty response.")

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        # Occasionally the model wraps JSON in a markdown code fence despite
        # the JSON response mode; strip it and retry once before giving up.
        match = re.search(r"\{.*\}|\[.*\]", raw_text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


def generate_grounded_answer(prompt_text: str, system_instruction: str = "") -> str:
    """
    Generate grounded AI answer using Gemini chat model.
    """
    init_genai()

    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
        try:
            logger.info("Sending RAG prompt to Gemini model '%s'...", settings.GEMINI_CHAT_MODEL)
            model = genai.GenerativeModel(
                model_name=settings.GEMINI_CHAT_MODEL,
                system_instruction=system_instruction if system_instruction else None,
            )
            response = model.generate_content(prompt_text)
            if response and hasattr(response, "text") and response.text:
                return response.text.strip()
        except Exception as exc:
            logger.warning("Gemini chat completion failed: %s. Using local synthesis fallback.", exc)

    # Local fallback responder synthesizing retrieved context
    logger.info("Using local grounded synthesis fallback responder.")
    return synthesize_fallback_response(prompt_text)


def synthesize_fallback_response(prompt_text: str) -> str:
    """Extract exact factual content from retrieved document excerpts."""
    marker = "RETRIEVED KNOWLEDGE BASE EXCERPTS:"
    if marker in prompt_text:
        context_part = prompt_text.split(marker)[1]
        if "RECENT CONVERSATION HISTORY:" in context_part:
            context_part = context_part.split("RECENT CONVERSATION HISTORY:")[0]
        elif "USER QUESTION:" in context_part:
            context_part = context_part.split("USER QUESTION:")[0]

        excerpts = []
        for block in context_part.split("--- EXCERPT"):
            clean_block = block.strip()
            if clean_block and not clean_block.startswith("No document"):
                # Format excerpt lines
                lines = [line.strip() for line in clean_block.split("\n") if line.strip() and not line.startswith("---")]
                if lines:
                    excerpts.append("\n".join(lines))

        if excerpts:
            formatted_text = "\n\n".join(excerpts[:4])
            return f"**Direct Knowledge Base Excerpts:**\n\n{formatted_text}"

    return "I am Recall AI, your Knowledge Base Assistant. Upload documents to your notebook to search and extract exact answers."
