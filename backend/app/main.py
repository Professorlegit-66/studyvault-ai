from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.documents import router as doc_router
from app.api.rag import router as rag_router
from app.api.student_memory import router as student_memory_router
from app.api.analytics import router as analytics_router

app = FastAPI(title="StudyVault AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(doc_router)
app.include_router(rag_router)
app.include_router(student_memory_router)
app.include_router(analytics_router)