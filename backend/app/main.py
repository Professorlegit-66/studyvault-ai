from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
import app.models  # Loads all models from app/models/__init__.py

from app.api.auth import router as auth_router
from app.api.documents import router as doc_router
from app.api.rag import router as rag_router
from app.api.student_memory import router as student_memory_router
from app.api.analytics import router as analytics_router
from app.api import assistant, companion


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Asynchronously create any missing database tables (e.g. review_logs)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="StudyVault AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(doc_router, prefix="/api")
app.include_router(rag_router, prefix="/api")
app.include_router(student_memory_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(assistant.router, prefix="/api")
app.include_router(companion.router, prefix="/api")