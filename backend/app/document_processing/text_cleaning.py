import re
import unicodedata


def clean_text(text: str) -> str:
    """Clean and normalize extracted document text."""
    if not text:
        return ""

    # Normalize unicode (NFC)
    text = unicodedata.normalize("NFC", text)

    # Standardize line breaks
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Replace non-breaking spaces with standard space
    text = text.replace("\xa0", " ").replace("\u200b", "")

    # Strip control characters (keep \n and \t)
    cleaned_chars = []
    for char in text:
        if char == "\n" or char == "\t" or not unicodedata.category(char).startswith("C"):
            cleaned_chars.append(char)
    text = "".join(cleaned_chars)

    # Normalize excessive spaces per line
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    text = "\n".join(lines)

    # Collapse more than 2 consecutive newlines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()
