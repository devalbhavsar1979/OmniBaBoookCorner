import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from models.models import Library, Book, User, UserRole
from schemas.schemas import LibraryCreate, LibraryUpdate

logger = logging.getLogger(__name__)


def create_library(db: Session, payload: LibraryCreate, owner: User) -> Library:
    if owner.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only Library Owners can create libraries")
    lib = Library(**payload.model_dump(), owner_id=owner.id)
    db.add(lib)
    db.commit()
    db.refresh(lib)
    logger.info(f"Library created: {lib.name} by user {owner.id}")
    return lib


def get_libraries(
    db: Session,
    search: Optional[str] = None,
    city: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> tuple[list, int]:
    query = db.query(Library).filter(Library.is_active == True)

    if search:
        query = query.filter(Library.name.ilike(f"%{search}%"))
    if city:
        query = query.filter(Library.city.ilike(f"%{city}%"))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    # attach book counts and owner name
    for lib in items:
        lib.book_count = db.query(func.count(Book.id)).filter(Book.library_id == lib.id).scalar()
        lib.owner_name = lib.owner.full_name if lib.owner else None

    return items, total


def get_library_by_id(db: Session, library_id: int) -> Library:
    lib = db.query(Library).filter(Library.id == library_id, Library.is_active == True).first()
    if not lib:
        raise HTTPException(status_code=404, detail="Library not found")
    lib.book_count = db.query(func.count(Book.id)).filter(Book.library_id == lib.id).scalar()
    lib.owner_name = lib.owner.full_name if lib.owner else None
    return lib


def get_my_libraries(db: Session, owner: User) -> list[Library]:
    libs = db.query(Library).filter(Library.owner_id == owner.id).all()
    for lib in libs:
        lib.book_count = db.query(func.count(Book.id)).filter(Book.library_id == lib.id).scalar()
        lib.owner_name = lib.owner.full_name if lib.owner else None
    return libs


def update_library(db: Session, library_id: int, payload: LibraryUpdate, owner: User) -> Library:
    lib = db.query(Library).filter(Library.id == library_id).first()
    if not lib:
        raise HTTPException(status_code=404, detail="Library not found")
    if lib.owner_id != owner.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this library")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lib, field, value)

    db.commit()
    db.refresh(lib)
    return lib


def delete_library(db: Session, library_id: int, owner: User) -> None:
    lib = db.query(Library).filter(Library.id == library_id).first()
    if not lib:
        raise HTTPException(status_code=404, detail="Library not found")
    if lib.owner_id != owner.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    lib.is_active = False
    db.commit()