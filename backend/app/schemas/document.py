from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class DocumentResponse(BaseModel):
    id: int
    filename: str = Field(..., validation_alias="title")
    file_path: str
    file_type: str
    file_size: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True