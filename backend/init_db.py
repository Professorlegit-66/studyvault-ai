import asyncio
from app.database import engine, Base
from app.models.user import User
from app.models.document import Document
from app.models.chunk import DocumentChunk

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(init_db())
    print("Tables initialized successfully!")