import io
import json
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

GENRES = [
    "Fiction", "Non-Fiction", "Comedy", "Science", "History", "Biography",
    "Mythological", "Story/Fantacy", "Spiritual/Meditation", "Sports/Music",
    "Health/Diet", "Drama", "Motivational/Self-Help", "Poetry", "Philosophy",
    "Religion", "Technology", "Other",
]

PROMPT = """You are a book metadata extractor for a library management system.
Analyze this book cover image carefully and extract the metadata.

Return ONLY a valid JSON object with exactly these keys — no markdown, no explanation:

{
  "title": "<book title as printed on the cover>",
  "author": "<author name as printed on the cover>",
  "language": "<EXACTLY one of: English, Gujarati, Hindi — detect from the script/alphabet used on the cover>",
  "age_group": "<EXACTLY one of: GENERIC, TODDLER, CHILDREN, TEENAGER, ADULT — look for age indicators on the cover; default GENERIC if unclear>",
  "genre_suggestion": "<EXACTLY one of: Fiction, Non-Fiction, Comedy, Science, History, Biography, Mythological, Story/Fantacy, Spiritual/Meditation, Sports/Music, Health/Diet, Drama, Motivational/Self-Help, Poetry, Philosophy, Religion, Technology, Other>",
  "confidence": "<EXACTLY one of: high, medium, low — your overall confidence in the extraction>",
  "notes": "<one sentence about anything uncertain, or empty string>"
}

Rules:
- If you cannot read the title clearly, set title to empty string and confidence to low
- Language: Latin alphabet → English, Gujarati script → Gujarati, Devanagari script → Hindi
- If cover shows both English and a regional language, use the dominant/primary language
- Return empty string for fields you cannot determine — do NOT guess wildly
- Return ONLY valid JSON, nothing else"""

VALID_LANGUAGES = {"English", "Gujarati", "Hindi"}
VALID_AGE_GROUPS = {"GENERIC", "TODDLER", "CHILDREN", "TEENAGER", "ADULT"}
VALID_GENRES = set(GENRES)
VALID_CONFIDENCE = {"high", "medium", "low"}


def _sanitize(data: dict) -> dict:
    """Clamp all fields to known enum values; fall back to safe defaults."""
    return {
        "title": str(data.get("title") or "").strip(),
        "author": str(data.get("author") or "").strip(),
        "language": data.get("language") if data.get("language") in VALID_LANGUAGES else "English",
        "age_group": data.get("age_group") if data.get("age_group") in VALID_AGE_GROUPS else "GENERIC",
        "genre_suggestion": data.get("genre_suggestion") if data.get("genre_suggestion") in VALID_GENRES else "Other",
        "confidence": data.get("confidence") if data.get("confidence") in VALID_CONFIDENCE else "low",
        "notes": str(data.get("notes") or "").strip(),
    }


def scan_book_cover(image_bytes: bytes, mime_type: str, api_key: str) -> dict:
    try:
        import google.generativeai as genai
        import PIL.Image

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        pil_image = PIL.Image.open(io.BytesIO(image_bytes))
        response = model.generate_content([PROMPT, pil_image])
        raw_text = (response.text or "").strip()

        # Strip markdown code fences if Gemini wraps in ```json ... ```
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            inner = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
            raw_text = "\n".join(inner)

        data = json.loads(raw_text)
        result = _sanitize(data)
        logger.info(f"Cover scan: title='{result['title']}' confidence={result['confidence']}")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Gemini returned non-JSON: {e}")
        return _sanitize({})
    except Exception as e:
        logger.error(f"Gemini scan error: {e}")
        raise HTTPException(status_code=502, detail=f"Cover scan failed: {str(e)}")
