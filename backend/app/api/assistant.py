# File: backend/app/api/assistant.py

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from google import genai

from app.config import settings
from app.api.deps import get_current_user

router = APIRouter(prefix="/assistant")

# --- Static "how the app works" context -------------------------------
# Kept as a plain string, not a RAG pipeline. This is intentional for
# Pass 1: it's cheap, deterministic, and easy to edit as features change.
# Update this whenever a feature is added/renamed/moved.
APP_KNOWLEDGE = """
You are the in-app Help Assistant for StudyVault AI, a study tool for students.
Answer ONLY questions about how to use the StudyVault AI app itself.
Do not answer questions about the content of a user's uploaded documents —
that is a separate feature called "AI Tutor Chat" and you should tell the
user to use that tab instead if they ask something document-specific.

Here is what the app can do, by section:

- Dashboard (Home): shows stat cards — number of documents, total flashcards,
  due flashcards, and a retention score.
- Documents: upload a PDF, DOCX, TXT, or MD file. Once uploaded, a document
  can be viewed (click "View"), deleted (single or multi-select), or used to
  generate flashcards automatically from its full content. Users can also
  highlight a snippet of text inside the document viewer and generate a
  flashcard from just that snippet.
- AI Tutor Chat: ask questions about the content of an uploaded document.
  Answers are grounded in that document (retrieval-augmented generation),
  not general knowledge. Users can filter which document(s) the chat should
  use as its source.
- Student Memory (flashcard review): review due flashcards using spaced
  repetition (SM-2 algorithm). Each flashcard tracks how well the user knows
  it and reschedules itself further out as it's reviewed correctly. Users
  can search flashcards, filter by topic, and export them.

Do not use markdown formatting (no asterisks, no bullet points, no headers).
Respond in plain conversational text only.
Keep answers short, friendly, and specific to the feature being asked about.
If asked something unrelated to using the app (e.g. general trivia, or a
question about a document's contents), politely redirect the user to the
right tab instead of answering it yourself.
"""

client = genai.Client(api_key=settings.GEMINI_API_KEY)


class AssistantQueryRequest(BaseModel):
    message: str


class AssistantQueryResponse(BaseModel):
    reply: str


@router.post("/query", response_model=AssistantQueryResponse)
async def query_assistant(
    payload: AssistantQueryRequest,
    current_user=Depends(get_current_user),
):
    """
    Pass 1 of the Help Assistant: plain Q&A about how to use the app.
    No action/target/navigation yet — that's Pass 2.
    """
    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=f"{APP_KNOWLEDGE}\n\nUser question: {payload.message}",
        )
        reply_text = response.text or "Sorry, I couldn't come up with an answer just now."

    except Exception as e:
        error_str = str(e)
        if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
            print(f"[Help Assistant] Gemini rate limit hit: {error_str}")
            reply_text = "I've hit my usage limit for now — please try again in a little while."
        else:
            print(f"[Help Assistant] Unexpected error: {error_str}")
            reply_text = "Sorry, something went wrong on my end. Please try again."

    return AssistantQueryResponse(reply=reply_text)