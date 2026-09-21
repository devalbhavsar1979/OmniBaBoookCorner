from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from config.settings import get_settings
from routers.dependencies import require_role
from models.models import User, UserRole, BookRequest, Book, Library
from routers.dependencies import get_current_user
from services.issue_register_service import get_issue_register
from services.email_service import send_overdue_reminder_email

router = APIRouter(prefix="/admin/issue-register", tags=["Admin"])


@router.get("")
def issue_register(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    library_id: Optional[int] = Query(None),
    overdue_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.READER)),
):
    settings = get_settings()
    # Readers see only their own issued books
    reader_id = current_user.id if current_user.role == UserRole.READER else None
    return get_issue_register(
        db=db,
        page=page,
        page_size=page_size,
        overdue_days=settings.OVERDUE_DAYS,
        library_id=library_id,
        overdue_only=overdue_only,
        reader_id=reader_id,
    )


@router.post("/{request_id}/remind")
def send_overdue_reminder(
    request_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    settings = get_settings()

    req = db.query(BookRequest).filter(BookRequest.id == request_id).first()
    if not req or not req.issued_at or req.closed_at:
        raise HTTPException(status_code=404, detail="Active issued request not found")

    days = (datetime.utcnow() - req.issued_at).days
    if days <= settings.OVERDUE_DAYS:
        raise HTTPException(status_code=400, detail="Book is not yet overdue")

    book = db.query(Book).filter(Book.id == req.book_id).first()
    library = db.query(Library).filter(Library.id == book.library_id).first()
    reader = db.query(User).filter(User.id == req.reader_id).first()
    owner = db.query(User).filter(User.id == library.owner_id).first()

    sent = send_overdue_reminder_email(
        reader_name=reader.full_name,
        reader_email=reader.email,
        book_title=book.title,
        book_author=book.author,
        library_name=library.name,
        owner_name=owner.full_name,
        owner_email=owner.email,
        owner_phone=owner.phone,
        issued_at=req.issued_at,
        days_issued=days,
    )

    if not sent:
        raise HTTPException(status_code=503, detail="Email could not be sent — check SMTP configuration")

    return {"sent": True, "to": reader.email}
