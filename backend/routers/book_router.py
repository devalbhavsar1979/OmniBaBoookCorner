from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.schemas import BookOut, PaginatedResponse
from services import book_service
from routers.dependencies import get_current_user, require_role
from models.models import User, UserRole, BookStatus
from schemas.schemas import BookRequestCreate, BookRequestOut

router = APIRouter(prefix="/books", tags=["Books"])


@router.post("/library/{library_id}", response_model=BookOut, status_code=201)
async def create_book(
    library_id: int,
    title: str = Form(...),
    author: str = Form(...),
    genre: str = Form(...),
    language: str = Form(...),
    description: Optional[str] = Form(None),
    front_image: Optional[UploadFile] = File(None),
    back_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """Add a book to a library. Owner only."""
    from schemas.schemas import BookCreate
    payload = BookCreate(title=title, author=author, genre=genre, language=language, description=description)
    return await book_service.create_book(db, library_id, payload, current_user, front_image, back_image)


@router.get("", response_model=PaginatedResponse)
def list_books(
    library_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    status: Optional[BookStatus] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search/filter books.
    - OWNER: only sees books from their own libraries
    - READER / VOLUNTEER: sees books from all libraries
    """
    owner_id = current_user.id if current_user.role == UserRole.OWNER else None
    items, total = book_service.get_books(
        db, library_id, search, genre, language, status, page, page_size, owner_id
    )
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[BookOut.model_validate(b) for b in items],
    )


@router.get("/{book_id}", response_model=BookOut)
def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a specific book by ID."""
    return book_service.get_book_by_id(db, book_id)


@router.put("/{book_id}", response_model=BookOut)
async def update_book(
    book_id: int,
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    front_image: Optional[UploadFile] = File(None),
    back_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """Update book details. Owner only."""
    from schemas.schemas import BookUpdate
    payload = BookUpdate(title=title, author=author, genre=genre, language=language, description=description)
    return await book_service.update_book(db, book_id, payload, current_user, front_image, back_image)


@router.delete("/{book_id}", status_code=204)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """Delete a book. Owner only. Book must be AVAILABLE."""
    book_service.delete_book(db, book_id, current_user)


@router.post("/{book_id}/issue", response_model=BookRequestOut)
def issue_book(
    book_id: int,
    payload: BookRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """Issue a book to a reader (owner only). Creates a BookRequest and updates book status to ISSUED."""
    # service will perform permission checks (owner of library)
    return book_service.issue_book(db, book_id, payload, current_user)
