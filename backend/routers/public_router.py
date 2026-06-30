from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from config.database import get_db
from schemas.schemas import BookOut, PaginatedResponse
from services import book_service
from models.models import AgeGroup, BookStatus

router = APIRouter(prefix="/public", tags=["Public"])


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