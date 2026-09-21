import json
import logging
import urllib.request
import urllib.error
from fastapi import HTTPException

logger = logging.getLogger(__name__)

LANGUAGE_MAP = {
    "eng": "English",
    "guj": "Gujarati",
    "hin": "Hindi",
    "mar": "Hindi",
    "san": "Hindi",
}

SUBJECT_GENRE_MAP = [
    (["biography", "autobiography", "memoir", "life of"], "Biography"),
    (["history", "historical"], "History"),
    (["science fiction", "sci-fi"], "Fiction"),
    (["fiction", "novel", "romance", "fantasy", "thriller", "mystery", "crime", "adventure", "horror", "detective"], "Fiction"),
    (["science", "physics", "chemistry", "biology", "mathematics", "math", "astronomy"], "Science"),
    (["technology", "computer", "programming", "software", "internet", "engineering"], "Technology"),
    (["philosophy"], "Philosophy"),
    (["religion", "religious", "hinduism", "islam", "christianity", "buddhism", "jainism"], "Religion"),
    (["meditation", "yoga", "mindfulness", "spiritual"], "Spiritual/Meditation"),
    (["poetry", "poems", "verse"], "Poetry"),
    (["drama", "play", "theatre"], "Drama"),
    (["motivation", "self-help", "self help", "success", "leadership", "productivity", "personal development"], "Motivational/Self-Help"),
    (["sports", "cricket", "football", "music", "art"], "Sports/Music"),
    (["health", "diet", "nutrition", "fitness", "medical", "wellness"], "Health/Diet"),
    (["mythology", "myth", "ramayana", "mahabharata", "puranas"], "Mythological"),
    (["children", "juvenile", "picture book", "fairy", "fantasy"], "Story/Fantacy"),
    (["comedy", "humor", "humour", "satire"], "Comedy"),
    (["non-fiction", "nonfiction", "essays", "general"], "Non-Fiction"),
]


def _map_genre(subjects: list) -> str:
    text = " ".join(subjects).lower()
    for keywords, genre in SUBJECT_GENRE_MAP:
        if any(kw in text for kw in keywords):
            return genre
    return "Other"


def _map_language(lang_key: str) -> str:
    code = lang_key.split("/")[-1]
    return LANGUAGE_MAP.get(code, "English")


def _map_age_group(subjects: list) -> str:
    text = " ".join(subjects).lower()
    if any(w in text for w in ["toddler", "baby", "infant"]):
        return "TODDLER"
    if any(w in text for w in ["juvenile", "children", "picture book", "kids"]):
        return "CHILDREN"
    if any(w in text for w in ["young adult", "teen", "teenager"]):
        return "TEENAGER"
    return "GENERIC"


def lookup_isbn(isbn: str) -> dict:
    isbn = isbn.replace("-", "").replace(" ", "").strip().upper()
    if len(isbn) not in (10, 13):
        raise HTTPException(status_code=400, detail="ISBN must be 10 or 13 digits")

    try:
        url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
        req = urllib.request.Request(url, headers={"User-Agent": "BaBookCorner/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())

        key = f"ISBN:{isbn}"
        if not data or key not in data:
            raise HTTPException(status_code=404, detail=f"No book found for ISBN {isbn}")

        book = data[key]

        title = book.get("title", "")
        subtitle = book.get("subtitle", "")
        if subtitle:
            title = f"{title}: {subtitle}"

        authors = book.get("authors", [])
        author = authors[0]["name"] if authors else ""

        languages = book.get("languages", [])
        language = _map_language(languages[0]["key"]) if languages else "English"

        subjects = [s.get("name", "") for s in book.get("subjects", [])]
        genre_suggestion = _map_genre(subjects)
        age_group = _map_age_group(subjects)

        cover = book.get("cover", {})
        cover_url = (
            cover.get("large")
            or cover.get("medium")
            or cover.get("small")
            or f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
        )

        notes = f"Subjects: {', '.join(subjects[:3])}" if subjects else ""

        logger.info(f"ISBN {isbn}: '{title}' by '{author}'")
        return {
            "title": title,
            "author": author,
            "language": language,
            "age_group": age_group,
            "genre_suggestion": genre_suggestion,
            "confidence": "high",
            "notes": notes,
            "cover_url": cover_url,
        }

    except HTTPException:
        raise
    except urllib.error.URLError as e:
        logger.error(f"ISBN lookup network error for {isbn}: {e}")
        raise HTTPException(status_code=502, detail="Could not reach Open Library. Check network and retry.")
    except Exception as e:
        logger.error(f"ISBN lookup error for {isbn}: {e}")
        raise HTTPException(status_code=502, detail=f"ISBN lookup failed: {str(e)}")
