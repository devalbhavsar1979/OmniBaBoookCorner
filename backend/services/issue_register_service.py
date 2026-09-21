from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from models.models import BookRequest, Book, Library, User, BookStatus


def get_issue_register(
    db: Session,
    page: int,
    page_size: int,
    overdue_days: int,
    library_id: Optional[int] = None,
    overdue_only: bool = False,
    reader_id: Optional[int] = None,
) -> dict:
    now = datetime.utcnow()
    overdue_cutoff = now - timedelta(days=overdue_days)
    second_week_cutoff = now - timedelta(days=7)

    base = (
        db.query(BookRequest, Book, Library, User)
        .join(Book, BookRequest.book_id == Book.id)
        .join(Library, Book.library_id == Library.id)
        .join(User, BookRequest.reader_id == User.id)
        .filter(BookRequest.issued_at.isnot(None))
        .filter(BookRequest.closed_at.is_(None))
    )

    if reader_id:
        base = base.filter(BookRequest.reader_id == reader_id)
    if library_id:
        base = base.filter(Library.id == library_id)

    # Summary counts (always across full unfiltered result set)
    on_time_count = base.filter(BookRequest.issued_at > second_week_cutoff).count()
    second_week_count = base.filter(
        BookRequest.issued_at <= second_week_cutoff,
        BookRequest.issued_at > overdue_cutoff,
    ).count()
    overdue_count = base.filter(BookRequest.issued_at <= overdue_cutoff).count()

    # Apply overdue_only filter for pagination
    query = base
    if overdue_only:
        query = query.filter(BookRequest.issued_at <= overdue_cutoff)

    total = query.count()
    rows = (
        query.order_by(BookRequest.issued_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for req, book, library, reader in rows:
        days = (now - req.issued_at).days
        contact = reader.phone or reader.email
        items.append({
            "request_id": req.id,
            "book_id": book.id,
            "book_title": book.title,
            "book_front_image": book.front_image,
            "library_id": library.id,
            "library_name": library.name,
            "reader_id": reader.id,
            "reader_name": reader.full_name,
            "reader_contact": contact,
            "issued_at": req.issued_at.isoformat(),
            "days_issued": days,
            "request_status": req.status.value,
            "status": "overdue" if days > overdue_days else ("second_week" if days > 7 else "on_time"),
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "overdue_days": overdue_days,
        "stats": {
            "on_time": on_time_count,
            "second_week": second_week_count,
            "overdue": overdue_count,
        },
        "items": items,
    }
