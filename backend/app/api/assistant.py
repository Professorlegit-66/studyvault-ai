# File: backend/routers/assistant.py

import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from google import genai
from google.genai import types

from app.config import settings
from app.api.deps import get_current_user

router = APIRouter(prefix="/assistant")

APP_KNOWLEDGE = """
You are the in-app Help Assistant for StudyVault AI, a study platform for students.
Answer ONLY questions about how to use the StudyVault AI app itself.
Do not answer questions about the content of a user's uploaded documents —
that is a separate feature called "AI Tutor Chat" and you should tell the
user to use that tab instead if they ask something document-specific.

Here is what the app can do, by section:

- Dashboard (Overview): shows stat cards — number of documents, total flashcards,
  due flashcards, retention score, and daily review activity heatmap.
- Documents Vault: upload PDF, DOCX, TXT, or MD files. Once uploaded, documents
  can be viewed, deleted, or used to generate flashcards automatically. Users can also
  highlight text snippets inside the document viewer to generate custom flashcards.
- AI Tutor Chat: ask questions about the content of uploaded documents. Answers are grounded
  in that document via Retrieval-Augmented Generation (RAG). Users can filter specific source documents.
- Student Memory (Flashcard Review): review due flashcards using spaced repetition (SM-2 algorithm).
  Users can also click "Generate Cards from Snippet" in the top toolbar to turn raw pasted text directly into flashcards.
- AI Companion: chat casually with a general-purpose AI assistant that retains personalized facts across threads.

Do not use markdown formatting (no asterisks, no bullet points, no headers).
Respond in plain conversational text only.
Keep answers short, friendly, and specific to the feature being asked about.
If asked something unrelated to using the app, politely redirect the user to the right tab.
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
    max_retries = 3
    base_delay = 2.0

    for attempt in range(max_retries):
        try:
            # Shifted to a chat-based implementation utilizing system_instruction
            chat = client.chats.create(
                model="gemini-3.5-flash",
                config=types.GenerateContentConfig(
                    system_instruction=APP_KNOWLEDGE,
                )
            )
            
            response = chat.send_message(payload.message)
            reply_text = response.text or "Sorry, I couldn't come up with an answer just now."
            
            return AssistantQueryResponse(reply=reply_text)

        except Exception as e:
            error_str = str(e)
            
            # Catch 503 UNAVAILABLE (demand spikes) and 429 RESOURCE_EXHAUSTED (rate limits)
            if any(err in error_str for err in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED"]):
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)  # Exponential backoff: 2s, 4s, etc.
                    print(f"[Help Assistant] API busy (503/429). Retrying in {delay}s... (Attempt {attempt+1}/{max_retries})")
                    await asyncio.sleep(delay)
                else:
                    print(f"[Help Assistant] Max retries reached: {error_str}")
                    reply_text = "The Help Assistant is currently experiencing unusually high demand. Please try again in a minute."
                    return AssistantQueryResponse(reply=reply_text)
            else:
                print(f"[Help Assistant] Unexpected error: {error_str}")
                reply_text = "Sorry, something went wrong on my end. Please try again."
                return AssistantQueryResponse(reply=reply_text)