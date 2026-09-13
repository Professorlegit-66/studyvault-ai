import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.auth import router as auth_router
from app.api.documents import router as doc_router
from app.api.rag import router as rag_router
from app.api.student_memory import router as student_memory_router
from app.api.analytics import router as analytics_router
from app.api import assistant
from app.api import companion
from app.services.cleanup_service import run_cleanup_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the stale-unverified-account cleanup as a background task that
    # runs for the lifetime of the app process, not tied to any request.
    cleanup_task = asyncio.create_task(run_cleanup_loop())
    yield
    cleanup_task.cancel()


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