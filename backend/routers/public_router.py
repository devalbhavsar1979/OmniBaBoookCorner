from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from html import escape

from config.database import get_db
from config.settings import get_settings
from schemas.schemas import BookOut, PaginatedResponse
from services import book_service
from models.models import AgeGroup, BookStatus

router = APIRouter(prefix="/public", tags=["Public"])
settings = get_settings()


@router.get("/books", response_model=PaginatedResponse)
def public_list_books(
    search: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    age_group: Optional[AgeGroup] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Public book catalogue — no authentication required."""
    items, total = book_service.get_books(
        db,
        library_id=None,
        search=search,
        genre=genre,
        language=language,
        status=BookStatus.AVAILABLE,   # public catalogue only shows available books
        page=page,
        page_size=page_size,
        owner_id=None,
        age_group=age_group,
    )
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[BookOut.model_validate(b) for b in items],
    )


@router.get("/books/{book_id}/share", response_class=HTMLResponse)
def share_book(
    book_id: int,
    thoughts: Optional[str] = Query(None, description="Reader's own thoughts about the book"),
    db: Session = Depends(get_db),
):
    """
    Server-rendered HTML page with Open Graph meta tags.

    This is the URL that gets shared on WhatsApp/Facebook — NOT the raw image URL.
    WhatsApp/Facebook crawlers fetch this page and read the og:title / og:description /
    og:image tags below to build the rich preview card (image + title + description).
    A raw image URL (e.g. .../uploads/cover.jpg) has no such tags, which is why it was
    only showing a bare link before.
    """
    book = book_service.get_book_by_id(db, book_id)

    base = settings.PUBLIC_BASE_URL.rstrip("/")
    front_image_url = f"{base}/uploads/{book.front_image}" if book.front_image else f"{base}/logo.png"
    page_url = f"{base}/api/v1/public/books/{book_id}/share"
    if thoughts:
        from urllib.parse import quote
        page_url += f"?thoughts={quote(thoughts)}"

    title = f"{book.title} by {book.author}"
    # Fix #2: combine book description AND reader thoughts so both appear in the OG card
    desc_parts = []
    if book.description and book.description.strip():
        desc_parts.append(book.description.strip())
    if thoughts and thoughts.strip():
        desc_parts.append(f'"{thoughts.strip()}"')
    description = "\n\n".join(desc_parts) if desc_parts else "Check out this book on Ba Boook Corner!"

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>{escape(title)}</title>
  <meta property="og:title" content="{escape(title)}" />
  <meta property="og:description" content="{escape(description)}" />
  <meta property="og:image" content="{escape(front_image_url)}" />
  <meta property="og:url" content="{escape(page_url)}" />
  <meta property="og:type" content="book" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{escape(title)}" />
  <meta name="twitter:description" content="{escape(description)}" />
  <meta name="twitter:image" content="{escape(front_image_url)}" />
  <meta http-equiv="refresh" content="0; url={escape(base)}/catalogue" />
</head>
<body>
  <p>Redirecting to <a href="{escape(base)}/books">Ba Boook Corner</a>…</p>
  <h1>{escape(title)}</h1>
  <img src="{escape(front_image_url)}" alt="{escape(book.title)}" style="max-width:300px;" />
  <p>{escape(description)}</p>
</body>
</html>"""
    return HTMLResponse(content=html)