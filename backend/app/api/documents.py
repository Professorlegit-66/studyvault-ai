import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from google import genai
import docx
import pypdf

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.schemas.document import DocumentResponse
from app.config import settings

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)

def extract_text_from_file(file_path: str, file_type: str) -> str:
    text = ""
    if file_type == "pdf":
        reader = pypdf.PdfReader(file_path)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    elif file_type in ["docx", "doc"]:
        doc = docx.Document(file_path)
        text = "\n".join([p.text for p in doc.paragraphs if p.text])
    else:  # txt / md / plain text
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    return text

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    words = text.split()
    if not words:
        return []
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

@router.get("/", response_model=List[DocumentResponse])
async def get_user_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Document).where(Document.user_id == current_user.id))
    return result.scalars().all()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ["pdf", "txt", "docx", "doc", "md"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Supported formats: .pdf, .docx, .txt, .md"
        )

    # 1. Save file locally
    user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # 2. Save Document record
    new_doc = Document(
        user_id=current_user.id,
        title=file.filename,
        file_path=file_path,
        file_type=ext,
        file_size=file_size
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)

    # 3. Extract, Chunk, and Embed content
    try:
        raw_text = extract_text_from_file(file_path, ext)
        text_chunks = chunk_text(raw_text)

        if not text_chunks:
            print(f"[Upload Warning] No text extracted from file: {file.filename}")

        for idx, text_content in enumerate(text_chunks):
            if not text_content.strip():
                continue
            
            # Generate embedding vector using standard model string
            emb_res = genai_client.models.embed_content(
                model="gemini-embedding-001",
                contents=text_content
            )
            vector = emb_res.embeddings[0].values

            # Save Chunk record
            chunk_record = DocumentChunk(
                document_id=new_doc.id,
                chunk_index=idx,
                content=text_content,
                embedding=vector
            )
            db.add(chunk_record)

        await db.commit()
        print(f"[Upload Success] Created {len(text_chunks)} chunks for document ID {new_doc.id}")

    except Exception as e:
        await db.rollback()
        print(f"[Upload Error] Embedding failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document embeddings: {str(e)}"
        )

    return new_doc

@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    await db.delete(doc)
    await db.commit()
    return {"detail": "Document deleted successfully"}