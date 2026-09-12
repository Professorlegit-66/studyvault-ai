import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from app.database import engine
from app.models.student_memory import Flashcard
from datetime import datetime, timezone

async def seed_card():
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with AsyncSessionLocal() as session:
        card = Flashcard(
            user_id=1,
            topic="Database Management Systems",
            question="What is the difference between DDL and DML?",
            answer="DDL (Data Definition Language) defines database structures (CREATE, ALTER). DML (Data Manipulation Language) manages data records (SELECT, INSERT, UPDATE).",
            repetition_number=0,
            interval_days=1,
            ease_factor=2.5,
            next_review_at=datetime.now(timezone.utc)
        )
        session.add(card)
        await session.commit()
        print("Sample flashcard seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_card())