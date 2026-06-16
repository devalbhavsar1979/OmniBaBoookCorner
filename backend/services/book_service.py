import os
import uuid
import logging
import aiofiles
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile

from models.models import Book, BookRequest, Library, User, UserRole, BookStatus
from schemas.schemas import BookCreate, BookUpdate
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}


async def save_image(file: UploadFile, upload_dir: str) -> str:
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Use: jpg, png, gif")

    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(upload_dir, filename)
    os.makedirs(upload_dir, exist_ok=True)

    async with aiofiles.open(path, "wb") as f:
        content = await file.read()
        await f.write(content)

    return filename


def _check_library_owner(db: Session, library_id: int, owner: User) -> Library:
    lib = db.query(Library).filter(Library.id == library_id, Library.is_active == True).first()
    if not lib:
        raise HTTPException(status_code=404, detail="Library not found")
    if lib.owner_id != owner.id:
        raise HTTPException(status_code=403, detail="Not authorized for this library")
    return lib


async def create_book(
    db: Session,
    library_id: int,
    payload: BookCreate,
    owner: User,
    front_image: Optional[UploadFile] = None,
    back_image: Optional[UploadFile] = None,
) -> Book:
    _check_library_owner(db, library_id, owner)

    front_filename = None
    back_filename = None

    if front_image and front_image.filename:
        front_filename = await save_image(front_image, settings.UPLOAD_DIR)
    if back_image and back_image.filename:
        back_filename = await save_image(back_image, settings.UPLOAD_DIR)

    book = Book(
        **payload.model_dump(),
        library_id=library_id,
        front_image=front_filename,
        back_image=back_filename,
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    logger.info(f"Book created: {book.title} in library {library_id}")
    return book


async def update_book(
    db: Session,
    book_id: int,
    payload: BookUpdate,
    owner: User,
    front_image: Optional[UploadFile] = None,
    back_image: Optional[UploadFile] = None,
) -> Book:
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    _check_library_owner(db, book.library_id, owner)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(book, field, value)

    if front_image and front_image.filename:
        book.front_image = await save_image(front_image, settings.UPLOAD_DIR)
    if back_image and back_image.filename:
        book.back_image = await save_image(back_image, settings.UPLOAD_DIR)

    db.commit()
    db.refresh(book)
    return book


def get_books(
    db: Session,
    library_id: Optional[int] = None,
    search: Optional[str] = None,
    genre: Optional[str] = None,
    language: Optional[str] = None,
    status: Optional[BookStatus] = None,
    page: int = 1,
    page_size: int = 20,
    owner_id: Optional[int] = None,  # when set, restrict to this owner's libraries only
) -> tuple[list, int]:
    query = db.query(Book)

    # Restrict to owner's libraries if owner_id provided
    if owner_id is not None:
        owner_library_ids = db.query(Library.id).filter(
            Library.owner_id == owner_id,
            Library.is_active == True
        ).subquery()
        query = query.filter(Book.library_id.in_(owner_library_ids))

    if library_id:
        query = query.filter(Book.library_id == library_id)
    if search:
        query = query.filter(
            Book.title.ilike(f"%{search}%") | Book.author.ilike(f"%{search}%")
        )
    if genre:
        query = query.filter(Book.genre.ilike(f"%{genre}%"))
    if language:
        query = query.filter(Book.language.ilike(f"%{language}%"))
    if status:
        query = query.filter(Book.status == status)

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    _attach_display_fields(db, items)
    return items, total


def _attach_display_fields(db: Session, books: list) -> None:
    """Attach library_name, library_owner_name and (if issued) issued_to_reader_name."""
    for book in books:
        lib = book.library
        book.library_name = lib.name if lib else None
        book.library_owner_name = lib.owner.full_name if (lib and lib.owner) else None

        book.issued_to_reader_name = None
        if book.status == BookStatus.ISSUED:
            active_request = (
                db.query(BookRequest)
                .filter(BookRequest.book_id == book.id, BookRequest.status == BookStatus.ISSUED)
                .order_by(BookRequest.issued_at.desc())
                .first()
            )
            if active_request and active_request.reader:
                book.issued_to_reader_name = active_request.reader.full_name


def get_book_by_id(db: Session, book_id: int) -> Book:
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    _attach_display_fields(db, [book])
    return book


def delete_book(db: Session, book_id: int, owner: User) -> None:
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    _check_library_owner(db, book.library_id, owner)
    if book.status != BookStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Cannot delete a book that is currently in use")
    db.delete(book)
    db.commit()


def issue_book(db: Session, book_id: int, payload, owner: User):
    """Issue a book directly to a reader. Creates a BookRequest and marks book as ISSUED.

    payload: BookIssueRequest (has reader_id, delivery_address)
    """
    # Fetch book
    book = db.query(Book).filter(Book.id == book_id).with_for_update().first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Verify owner owns the library
    lib = db.query(Library).filter(Library.id == book.library_id, Library.is_active == True).first()
    if not lib or lib.owner_id != owner.id:
        raise HTTPException(status_code=403, detail="Not authorized for this library")

    # Only allow issuing when book is AVAILABLE (you can extend this logic)
    if book.status != BookStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Book is not available for issuing")

    # Validate reader exists and is an active reader
    reader_id = getattr(payload, 'reader_id', None)
    if not reader_id:
        raise HTTPException(status_code=400, detail="reader_id is required")

    reader = db.query(User).filter(
        User.id == reader_id,
        User.role == UserRole.READER,
        User.is_active == True,
    ).first()
    if not reader:
        raise HTTPException(status_code=404, detail="Reader not found")

    # Create BookRequest
    br = BookRequest(
        book_id=book.id,
        reader_id=reader.id,
        volunteer_id=None,
        delivery_address=payload.delivery_address,
        delivery_notes=getattr(payload, 'delivery_notes', None),
        status=BookStatus.ISSUED,
        issued_at=datetime.utcnow(),
    )
    db.add(br)

    # Update book status
    book.status = BookStatus.ISSUED

    db.commit()
    db.refresh(br)
    db.refresh(book)
    return br