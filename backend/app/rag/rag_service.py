import logging
from typing import Dict, Any, List, Optional

from app.core.config import settings
from app.rag.vector_search_service import search_notebook_chunks
from app.langchain_integration.chain import run_langchain_rag_chain
from app.sources.services import list_notebook_sources
from app.chat.services import (
    get_or_create_conversation,
    save_chat_message,
    get_recent_conversation_messages,
)

logger = logging.getLogger(__name__)


async def execute_rag_chat(
    notebook_id: str,
    user_message: str,
    conversation_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Execute exact Knowledge Base RAG pipeline:
    Search Chunks -> Extract Raw Context -> LangChain RAG Chain -> Exact Grounded Answer + Citations
    """
    # Step 1: Ensure conversation exists
    conversation = await get_or_create_conversation(
        notebook_id=notebook_id,
        conversation_id=conversation_id,
        initial_title=user_message,
    )
    conv_id = conversation["id"]

    # Step 2: Save user message in MongoDB
    await save_chat_message(
        conversation_id=conv_id,
        notebook_id=notebook_id,
        role="user",
        content=user_message,
    )

    # Step 3: Fetch list of notebook sources for summary context
    notebook_sources = await list_notebook_sources(notebook_id)
    if notebook_sources:
        sources_summary = "\n".join(
            [f"- {s['title']} ({s['file_type']}, {s['chunk_count']} chunks)" for s in notebook_sources]
        )
    else:
        sources_summary = "No documents currently uploaded to this notebook."

    # Step 4: Vector search for top K relevant document chunks in active notebook
    retrieved_chunks = await search_notebook_chunks(
        notebook_id=notebook_id,
        query=user_message,
        top_k=max(settings.RAG_TOP_K, 6),
    )

    # Build context blocks & structured citations from retrieved document chunks
    context_blocks = []
    citations = []
    sources_used_set = set()

    if retrieved_chunks:
        for idx, chunk in enumerate(retrieved_chunks):
            title = chunk.get("source_title", "Source Document")
            page = chunk.get("page_number", 1)
            source_id = chunk.get("source_id", "")
            chunk_id = chunk.get("chunk_id", "")
            text = chunk.get("text", "")
            score = chunk.get("similarity_score", 0.0)

            sources_used_set.add(title)
            context_blocks.append(
                f"--- EXCERPT {idx+1} [Document: {title} | Page {page} | Chunk ID: {chunk_id}] ---\n{text}\n"
            )

            citations.append({
                "source_id": source_id,
                "source_name": title,
                "page": page,
                "chunk_id": chunk_id,
                "chunk_index": chunk.get("chunk_index", 0),
                "similarity_score": score,
                "text": text,
            })

    formatted_context = (
        "\n".join(context_blocks)
        if context_blocks
        else "No document text chunks available in this notebook."
    )

    # Step 5: Format recent conversation history
    history_msgs = await get_recent_conversation_messages(
        conv_id, limit=settings.MAX_CONVERSATION_HISTORY
    )
    history_lines = []
    for msg in history_msgs[:-1]:  # exclude current question
        role_label = "User" if msg.get("role") == "user" else "Assistant"
        history_lines.append(f"{role_label}: {msg.get('content')}")

    formatted_history = "\n".join(history_lines) if history_lines else "None"

    # Step 6: Execute LangChain RAG Chain to synthesize exact grounded answer
    answer_text = run_langchain_rag_chain(
        question=user_message,
        context=formatted_context,
        sources_summary=sources_summary,
        history=formatted_history,
    )

    sources_used_list = sorted(list(sources_used_set))

    # Step 7: Save assistant response in MongoDB
    await save_chat_message(
        conversation_id=conv_id,
        notebook_id=notebook_id,
        role="assistant",
        content=answer_text,
        citations=citations if retrieved_chunks else [],
        sources_used=sources_used_list,
    )

    return {
        "conversation_id": conv_id,
        "answer": answer_text,
        "citations": citations if retrieved_chunks else [],
        "sources_used": sources_used_list,
    }
