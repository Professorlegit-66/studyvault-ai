import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from pypdf import PdfReader

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "uploads"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

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
    extracted_text = ""
    try:
        if file_type.lower() == ".pdf":
            reader = PdfReader(file_path)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        elif file_type.lower() in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()
    except Exception as e:
        print(f"Text extraction warning: {e}")
        extracted_text = "Text extraction failed or document contains no readable text."

    return extracted_text.strip()