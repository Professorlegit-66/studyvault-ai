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
    """Raised when a document's text cannot be extracted."""
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


def extract_pages_from_file(file_path: str, file_type: str) -> list[tuple[int, str]]:
    """Extracts text page-by-page or creates virtual pages for non-PDF files. Returns a list of (page_number, text) tuples."""
    ext = file_type.lower()
    pages: list[tuple[int, str]] = []
    try:
        if ext == ".pdf":
            reader = PdfReader(file_path)
            for idx, page in enumerate(reader.pages, start=1):
                text = page.extract_text()
                if text and text.strip():
                    pages.append((idx, text.strip()))

        elif ext == ".docx":
            doc = docx.Document(file_path)
            current_chunk = []
            current_length = 0
            page_num = 1
            
            for para in doc.paragraphs:
                text = para.text.strip()
                if not text:
                    continue
                current_chunk.append(text)
                current_length += len(text)
                
                # Create a virtual page roughly every 1,800 characters or 8 paragraphs
                if current_length >= 1800 or len(current_chunk) >= 8:
                    pages.append((page_num, "\n\n".join(current_chunk)))
                    page_num += 1
                    current_chunk = []
                    current_length = 0
            
            # Append any remaining text
            if current_chunk:
                pages.append((page_num, "\n\n".join(current_chunk)))

        elif ext in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()
            
            if extracted_text.strip():
                # Split by double newlines to respect paragraph/section breaks
                paragraphs = [p.strip() for p in extracted_text.split("\n\n") if p.strip()]
                if not paragraphs:
                    paragraphs = [extracted_text.strip()]
                
                current_chunk = []
                current_length = 0
                page_num = 1
                
                for para in paragraphs:
                    current_chunk.append(para)
                    current_length += len(para)
                    
                    if current_length >= 1800 or len(current_chunk) >= 8:
                        pages.append((page_num, "\n\n".join(current_chunk)))
                        page_num += 1
                        current_chunk = []
                        current_length = 0
                
                if current_chunk:
                    pages.append((page_num, "\n\n".join(current_chunk)))

    except Exception as e:
        print(f"[Text Extraction Error] {file_path}: {e}")
        raise TextExtractionError(
            f"Could not extract text from this {ext} file. It may be corrupted, "
            f"password-protected, or an image-only (scanned) document."
        ) from e

    if not pages:
        raise TextExtractionError(
            f"No readable text found in this {ext} file. It may be a scanned "
            f"or image-only document with no text layer."
        )

    return pages