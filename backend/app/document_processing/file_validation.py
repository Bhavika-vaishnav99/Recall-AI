import os
from typing import Tuple

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".md", ".markdown"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25MB limit


def validate_file(filename: str, file_size: int) -> Tuple[bool, str]:
    """Validate uploaded document extension and file size."""
    if not filename:
        return False, "Filename cannot be empty"

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file extension '{ext}'. Allowed extensions are: {', '.join(sorted(ALLOWED_EXTENSIONS))}"

    if file_size > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        return False, f"File size exceeds maximum allowed limit of {max_mb} MB"

    return True, ""


def get_file_type(filename: str) -> str:
    """Standardize file type string from filename."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return "pdf"
    elif ext == ".docx":
        return "docx"
    elif ext in (".md", ".markdown"):
        return "markdown"
    elif ext == ".txt":
        return "txt"
    return "unknown"
