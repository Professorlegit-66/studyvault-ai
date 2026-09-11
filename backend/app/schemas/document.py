from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class DocumentBase(BaseModel):
    title: str

class DocumentResponse(BaseModel):
    id: int
    user_id: int
    title: str
    file_path: str
    file_type: str
    file_size: Optional[int] = 0
    summary: Optional[str] = None
    key_points: Optional[List[str]] = []
    created_at: datetime

    class Config:
        from_attributes = True

class SummaryResponse(BaseModel):
    document_id: int
    summary: str
    key_points: List[str]