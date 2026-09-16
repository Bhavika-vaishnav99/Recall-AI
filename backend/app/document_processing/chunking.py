import re
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter

CHUNK_SIZE = 1500
CHUNK_OVERLAP = 200

# Minimum number of characters a chunk must have to be kept. Filters out
# near-empty fragments (stray punctuation, single words) that add noise
# to the vector index without any retrievable meaning.
MIN_CHUNK_CHARS = 8

# A line is treated as the start of a new FAQ question when it begins with
# a numbered/lettered list marker or an explicit "Q" label and ends with a
# question mark, e.g. "18. What types of documents can be used for RAG?"
# or "Q: Who am I?". Requiring the leading marker (rather than matching any
# line that merely ends in "?") avoids false positives on rhetorical
# questions inside normal prose.
_FAQ_QUESTION_LINE_RE = re.compile(
    r"^\s*(?:\d+\s*[.)]|Q\s*[:.)]|Question\s*\d*\s*[:.)]?)\s*.{2,300}\?\s*$",
    re.IGNORECASE,
)

# A page needs at least this many question-marker lines before we treat it
# as an FAQ document; otherwise we fall back to generic recursive splitting.
MIN_FAQ_QUESTIONS = 2


def _split_into_faq_blocks(text: str) -> List[str]:
    """
    Split FAQ-style text into complete question+answer blocks, so each
    Q&A pair is kept whole in a single block. Returns [] if the text does
    not look like an FAQ list (fewer than MIN_FAQ_QUESTIONS question lines).
    """
    lines = text.split("\n")
    question_idxs = [
        i for i, line in enumerate(lines) if _FAQ_QUESTION_LINE_RE.match(line.strip())
    ]

    if len(question_idxs) < MIN_FAQ_QUESTIONS:
        return []

    blocks = []

    # Preamble text before the first question (e.g. a document title/heading)
    # is attached to the first Q&A pair instead of floating on its own.
    preamble = "\n".join(lines[: question_idxs[0]]).strip()

    for idx, start in enumerate(question_idxs):
        end = question_idxs[idx + 1] if idx + 1 < len(question_idxs) else len(lines)
        block_text = "\n".join(lines[start:end]).strip()
        if not block_text:
            continue
        if idx == 0 and preamble:
            block_text = f"{preamble}\n{block_text}"
        blocks.append(block_text)

    return blocks


def create_document_chunks(
    pages: List[Dict[str, Any]],
    source_id: str,
    notebook_id: str,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> List[Dict[str, Any]]:
    """
    Split extracted document pages into text chunks with metadata.
    FAQ-style pages (numbered/labelled "Q ... ?" entries) are split so
    that each question stays paired with its complete answer in a single
    chunk. Non-FAQ text falls back to recursive character splitting.
    Returns list of chunk dicts ready for MongoDB insertion.
    """
    chunks = []
    global_chunk_index = 0
    seen_texts = set()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""],
    )

    def add_chunk(chunk_text: str, page_num: int) -> None:
        nonlocal global_chunk_index
        normalized = chunk_text.strip()
        if len(normalized) < MIN_CHUNK_CHARS:
            return
        # Skip exact-duplicate chunks within the same source (defensive
        # guard against pathological/duplicate splitter output).
        if normalized in seen_texts:
            return
        seen_texts.add(normalized)
        chunks.append({
            "source_id": source_id,
            "notebook_id": notebook_id,
            "chunk_index": global_chunk_index,
            "page_number": page_num,
            "text": normalized,
            "char_count": len(normalized),
        })
        global_chunk_index += 1

    for page_item in pages:
        page_num = page_item.get("page", 1)
        text = page_item.get("text", "")
        if not text.strip():
            continue

        faq_blocks = _split_into_faq_blocks(text)
        if faq_blocks:
            for block in faq_blocks:
                if len(block) <= chunk_size:
                    add_chunk(block, page_num)
                else:
                    # Rare oversized Q&A block: sub-split but keep it
                    # self-contained rather than merging with neighbors.
                    for sub_chunk in text_splitter.split_text(block):
                        add_chunk(sub_chunk, page_num)
            continue

        for chunk_text in text_splitter.split_text(text):
            add_chunk(chunk_text, page_num)

    return chunks
