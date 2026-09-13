import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from pypdf import PdfReader
import docx

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "uploads"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


class TextExtractionError(Exception):
    """Raised when a document's text cannot be extracted. Callers must
    treat this as a failed upload - never fall back to storing a placeholder
    string as if it were real document content (it would get embedded and
    surfaced in RAG answers/flashcards as genuine material)."""
    pass


async def save_uploaded_file(file: UploadFile) -> tuple[str, str, int]:
    file_extension = os.path.splitext(file.filename)[1].lower() if file.filename else ".pdf"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = str(STORAGE_DIR / unique_filename)

    content = await file.read()
    file_size = len(content)

    with open(file_path, "wb") as f:
        f.write(content)

    return unique_filename, file_path, file_size


def extract_text_from_file(file_path: str, file_type: str) -> str:
    ext = file_type.lower()
    try:
        extracted_text = ""
        if ext == ".pdf":
            reader = PdfReader(file_path)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        elif ext == ".docx":
            doc = docx.Document(file_path)
            extracted_text = "\n".join([p.text for p in doc.paragraphs if p.text])
        elif ext in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()
    except Exception as e:
        print(f"[Text Extraction Error] {file_path}: {e}")
        raise TextExtractionError(
            f"Could not extract text from this {ext} file. It may be corrupted, "
            f"password-protected, or an image-only (scanned) document."
        ) from e

    extracted_text = extracted_text.strip()
    if not extracted_text:
        # Parsing succeeded but produced nothing (e.g. a scanned PDF with no
        # OCR text layer). Same failure mode as an exception - don't let an
        # empty document silently become a "document" with zero real chunks
        # look identical to a real upload.
        raise TextExtractionError(
            f"No readable text found in this {ext} file. It may be a scanned "
            f"or image-only document with no text layer."
        )

    return extracted_text