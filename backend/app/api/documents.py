import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.document import DocumentResponse
from app.services.document_service import save_uploaded_file, extract_text_from_file

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    original_filename = file.filename or "uploaded_file.pdf"
    ext = os.path.splitext(original_filename)[1].lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    try:
        unique_filename, file_path, file_size = await save_uploaded_file(file)
        extracted_text = extract_text_from_file(file_path, ext)

        # Build payload dynamically based on SQLAlchemy Document attributes
        doc_kwargs = {
            "user_id": current_user.id,
            "title": original_filename,
            "file_path": file_path,
            "file_type": ext,
        }

        # Dynamically attach text to whichever attribute exists on your model
        for field in ["extracted_text", "content", "raw_text", "text", "file_content"]:
            if hasattr(Document, field):
                doc_kwargs[field] = extracted_text
                break

        new_doc = Document(**doc_kwargs)

        db.add(new_doc)
        await db.commit()
        await db.refresh(new_doc)
        
        setattr(new_doc, "file_size", file_size)
        return new_doc
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File processing failed: {str(e)}"
        )

@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document).where(Document.user_id == current_user.id).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    
    for doc in docs:
        if doc.file_path and os.path.exists(doc.file_path):
            setattr(doc, "file_size", os.path.getsize(doc.file_path))
        else:
            setattr(doc, "file_size", 0)
            
    return docs

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
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted successfully"}