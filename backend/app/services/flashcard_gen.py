import json
import re
from google import genai
from google.genai import types
from app.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)


async def generate_flashcards_from_text(document_text: str, topic: str):
    api_key = getattr(settings, "GEMINI_API_KEY", None)

    if api_key and api_key != "dummy-key":
        try:
            prompt = f"""
            You are an expert AI study assistant. Based on the following document text, generate 3 to 5 high-yield study flashcards.
            Topic: {topic}

            Return ONLY a valid JSON array of objects with "question" and "answer" keys. Example:
            [
              {{"question": "What is X?", "answer": "X is Y."}}
            ]

            Document Text:
            {document_text[:4000]}
            """

            response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                ),
            )
            content = response.text.strip()

            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()

            parsed = json.loads(content)
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
        except Exception as e:
            print(f"Gemini generation failed, falling back to local extraction: {e}")

    # Fallback local extraction logic
    fallback_cards = []
    sentences = re.split(r"(?<=[.!?])\s+", document_text)

    for s in sentences:
        s = s.strip()
        if len(s) > 20:
            if " is " in s:
                parts = s.split(" is ", 1)
                fallback_cards.append(
                    {"question": f"What can you tell about {parts[0].strip()}?", "answer": s}
                )
            elif ":" in s:
                parts = s.split(":", 1)
                fallback_cards.append(
                    {"question": f"Explain: {parts[0].strip()}", "answer": s}
                )

    if not fallback_cards:
        fallback_cards = [
            {
                "question": f"What is the core focus of {topic}?",
                "answer": document_text[:200]
                if document_text
                else f"Core concepts related to {topic}.",
            },
            {
                "question": f"Summarize the key takeaway from {topic}.",
                "answer": "Review uploaded document notes for detailed breakdowns and definitions.",
            },
        ]

    return fallback_cards[:4]