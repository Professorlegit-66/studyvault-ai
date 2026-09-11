import os
import json
from google import genai
from google.genai import types

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

def generate_summary(text: str) -> dict:
    if not text or len(text.strip()) == 0:
        return {
            "summary": "No text content available to summarize.",
            "key_points": []
        }

    client = get_gemini_client()
    
    if client:
        try:
            prompt = f"""
            Analyze the following academic text and return a JSON object with exactly two keys:
            1. "summary": A concise paragraph summarizing the document (2-3 sentences).
            2. "key_points": A JSON array of 4 to 6 concise bullet points highlighting key concepts or definitions.

            Do not output markdown code blocks or extra text—return raw JSON only.

            Document Text:
            {text[:6000]}
            """

            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3
                )
            )
            
            data = json.loads(response.text)
            return {
                "summary": data.get("summary", "Summary generation succeeded."),
                "key_points": data.get("key_points", [])
            }
        except Exception as e:
            print(f"[AI SERVICE ERROR] Gemini call failed: {e}")

    # Fallback extractive logic
    sentences = [s.strip() for s in text[:4000].split('.') if len(s.strip()) > 15]
    summary_text = ". ".join(sentences[:3]) + "." if sentences else text[:300] + "..."
    key_points = sentences[3:8] if len(sentences) >= 8 else sentences[:5]

    return {
        "summary": summary_text,
        "key_points": key_points or ["Key concepts extracted directly from document."]
    }