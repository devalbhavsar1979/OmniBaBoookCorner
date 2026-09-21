import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session, aliased
from fastapi import HTTPException

from models.models import BookRequest, Book, Library, User, UserRole, BookStatus
from schemas.schemas import BookRequestCreate
from services.email_service import send_status_email
from services import gamification_service

logger = logging.getLogger(__name__)

# Define allowed transitions per actor
READER_TRANSITIONS = {
    BookStatus.ISSUED: BookStatus.RETURN_REQUESTED,
}

VOLUNTEER_TRANSITIONS = {
    BookStatus.REQUESTED: BookStatus.REQUEST_ACCEPTED,
    BookStatus.REQUEST_ACCEPTED: BookStatus.VOLUNTEER_PICKED,
    BookStatus.VOLUNTEER_PICKED: BookStatus.VOLUNTEER_DELIVERED,
    BookStatus.RETURN_REQUESTED: BookStatus.RETURN_PICKED,
    BookStatus.RETURN_PICKED: BookStatus.RETURN_DELIVERED,
}

OWNER_TRANSITIONS = {
    BookStatus.REQUESTED: BookStatus.ISSUED,       # direct issue (no volunteer delivery)
    BookStatus.VOLUNTEER_DELIVERED: BookStatus.ISSUED,
    BookStatus.RETURN_REQUESTED: BookStatus.AVAILABLE,
    BookStatus.RETURN_DELIVERED: BookStatus.AVAILABLE,
}


MAX_ACTIVE_REQUESTS = 3


def _count_active_requests(db: Session, reader_id: int) -> int:
    return db.query(BookRequest).filter(
        BookRequest.reader_id == reader_id,
        BookRequest.status != BookStatus.AVAILABLE,
    ).count()


def create_request(db: Session, payload: BookRequestCreate, reader: User) -> BookRequest:
    if reader.role != UserRole.READER:
        raise HTTPException(status_code=403, detail="Only readers can request books")

    book = db.query(Book).filter(Book.id == payload.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if book.status != BookStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Book is not available for request")

    active = _count_active_requests(db, reader.id)
    if active >= MAX_ACTIVE_REQUESTS:
        raise HTTPException(
            status_code=400,
            detail=f"You already have {active} active book requests. Please return a book before requesting another.",
        )

    # Update book status
    book.status = BookStatus.REQUESTED

    req = BookRequest(
        book_id=payload.book_id,
        reader_id=reader.id,
        delivery_address=payload.delivery_address,
        delivery_notes=payload.delivery_notes,
        status=BookStatus.REQUESTED,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    logger.info(f"Book request created: book {book.id} by reader {reader.id}")

    # Send email notification to reader
    try:
        lib = db.query(Library).filter(Library.id == book.library_id).first()
        owner = db.query(User).filter(User.id == lib.owner_id).first()
        send_status_email(req, book, lib, owner, reader, None, "REQUESTED")
    except Exception as e:
        logger.error(f"Email trigger failed after create_request: {e}")

    return req


def get_requests(
    db: Session,
    user: User,
    statuses: Optional[list[BookStatus]] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list, int]:
    ReaderUser = aliased(User)
    VolunteerUser = aliased(User)

    query = (
        db.query(BookRequest)
        .join(Book, BookRequest.book_id == Book.id)
        .outerjoin(ReaderUser, BookRequest.reader_id == ReaderUser.id)
        .outerjoin(VolunteerUser, BookRequest.volunteer_id == VolunteerUser.id)
    )

    if user.role == UserRole.READER:
        query = query.filter(BookRequest.reader_id == user.id)
    elif user.role == UserRole.VOLUNTEER:
        query = query.filter(
            (BookRequest.status == BookStatus.REQUESTED) |
            (BookRequest.status == BookStatus.RETURN_REQUESTED) |
            (BookRequest.volunteer_id == user.id)
        )
    elif user.role == UserRole.OWNER:
        query = query.join(Library, Book.library_id == Library.id).filter(Library.owner_id == user.id)
    # SUPER_ADMIN: no filter — sees all requests

    if statuses:
        query = query.filter(BookRequest.status.in_(statuses))

    if search:
        like = f"%{search}%"
        query = query.filter(
            Book.title.ilike(like) |
            ReaderUser.full_name.ilike(like) |
            VolunteerUser.full_name.ilike(like)
        )

    total = query.count()
    items = (
        query.order_by(BookRequest.requested_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def get_request_by_id(db: Session, request_id: int, user: User) -> BookRequest:
    req = db.query(BookRequest).filter(BookRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Authorization check
    if user.role == UserRole.READER and req.reader_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user.role == UserRole.VOLUNTEER and req.volunteer_id not in (None, user.id):
        pass  # volunteers can view any open request
    if user.role == UserRole.OWNER:
        book = db.query(Book).filter(Book.id == req.book_id).first()
        lib = db.query(Library).filter(Library.id == book.library_id).first()
        if lib.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    # SUPER_ADMIN: can view any request, no additional check needed

    return req


def _update_timestamp(req: BookRequest, new_status: BookStatus, from_status: BookStatus = None) -> None:
    now = datetime.utcnow()
    ts_map = {
        BookStatus.REQUEST_ACCEPTED: "accepted_at",
        BookStatus.VOLUNTEER_PICKED: "picked_at",
        BookStatus.VOLUNTEER_DELIVERED: "delivered_at",
        BookStatus.ISSUED: "issued_at",
        BookStatus.RETURN_REQUESTED: "return_requested_at",
        BookStatus.RETURN_PICKED: "return_picked_at",
        BookStatus.RETURN_DELIVERED: "return_delivered_at",
        BookStatus.AVAILABLE: "closed_at",
    }
    if new_status in ts_map:
        setattr(req, ts_map[new_status], now)
    # Owner accepting return directly (skipping volunteer pickup/delivery) —
    # also stamp return_delivered_at for a consistent audit trail
    if new_status == BookStatus.AVAILABLE and from_status == BookStatus.RETURN_REQUESTED:
        req.return_delivered_at = now


def advance_request_status(
    db: Session,
    request_id: int,
    user: User,
) -> BookRequest:
    # Lock the row so two actors (owner + volunteer) can't both accept the
    # same RETURN_REQUESTED (or any other) request at the same time.
    req = db.query(BookRequest).filter(BookRequest.id == request_id).with_for_update().first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    current = req.status
    new_status = None

    if user.role == UserRole.VOLUNTEER:
        if current == BookStatus.REQUESTED:
            # Auto-assign volunteer
            req.volunteer_id = user.id
        elif current == BookStatus.RETURN_REQUESTED:
            # Volunteer accepting a return pickup — assign if not already
            # claimed by another volunteer (owner may also be racing to accept)
            if req.volunteer_id and req.volunteer_id != user.id:
                raise HTTPException(status_code=409, detail="Already accepted by another volunteer")
            req.volunteer_id = user.id
        elif req.volunteer_id != user.id:
            raise HTTPException(status_code=403, detail="Not your assignment")
        new_status = VOLUNTEER_TRANSITIONS.get(current)

    elif user.role == UserRole.OWNER:
        book = db.query(Book).filter(Book.id == req.book_id).first()
        lib = db.query(Library).filter(Library.id == book.library_id).first()
        if lib.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Not your library")
        new_status = OWNER_TRANSITIONS.get(current)

    elif user.role == UserRole.SUPER_ADMIN:
        # Super admin can perform the same transitions an owner could, on any library
        new_status = OWNER_TRANSITIONS.get(current)

    elif user.role == UserRole.READER:
        if req.reader_id != user.id:
            raise HTTPException(status_code=403, detail="Not your request")
        new_status = READER_TRANSITIONS.get(current)

    if new_status is None:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {current.value} with role {user.role.value}"
        )

    _update_timestamp(req, new_status, current)
    req.status = new_status

    # Sync book status
    book = db.query(Book).filter(Book.id == req.book_id).first()
    if new_status == BookStatus.AVAILABLE:
        book.status = BookStatus.AVAILABLE
    else:
        book.status = new_status

    if new_status == BookStatus.ISSUED:
        gamification_service.award_points(
            db, req.reader_id, 20, "BOOK_ISSUED", f"Borrowed: {book.title}"
        )

    db.commit()
    db.refresh(req)
    logger.info(f"Request {req.id} advanced: {current} → {new_status} by user {user.id}")

    # Send email notification to reader (fire-and-forget)
    try:
        fresh_book = db.query(Book).filter(Book.id == req.book_id).first()
        lib = db.query(Library).filter(Library.id == fresh_book.library_id).first()
        owner = db.query(User).filter(User.id == lib.owner_id).first()
        reader = db.query(User).filter(User.id == req.reader_id).first()
        volunteer = db.query(User).filter(User.id == req.volunteer_id).first() if req.volunteer_id else None
        new_status_str = new_status.value if hasattr(new_status, "value") else str(new_status)
        send_status_email(req, fresh_book, lib, owner, reader, volunteer, new_status_str)
    except Exception as e:
        logger.error(f"Email trigger failed after advance_request_status: {e}")

    return req


def direct_return_by_admin(db: Session, request_id: int, user: User) -> BookRequest:
    req = db.query(BookRequest).filter(BookRequest.id == request_id).with_for_update().first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status != BookStatus.ISSUED:
        raise HTTPException(status_code=400, detail="Direct return is only allowed for ISSUED books")

    book = db.query(Book).filter(Book.id == req.book_id).first()
    lib = db.query(Library).filter(Library.id == book.library_id).first()

    if user.role == UserRole.OWNER:
        if lib.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Not your library")
    elif user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only library owners and super admin can perform a direct return")

    now = datetime.utcnow()
    req.status = BookStatus.AVAILABLE
    req.return_delivered_at = now
    req.closed_at = now
    book.status = BookStatus.AVAILABLE

    db.commit()
    db.refresh(req)
    logger.info(f"Request {req.id} direct-returned by admin user {user.id}")

    try:
        owner = db.query(User).filter(User.id == lib.owner_id).first()
        reader = db.query(User).filter(User.id == req.reader_id).first()
        volunteer = db.query(User).filter(User.id == req.volunteer_id).first() if req.volunteer_id else None
        send_status_email(req, book, lib, owner, reader, volunteer, "AVAILABLE")
    except Exception as e:
        logger.error(f"Email trigger failed after direct_return_by_admin: {e}")

    return req


def cancel_request(db: Session, request_id: int, user: User) -> None:
    req = db.query(BookRequest).filter(BookRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status != BookStatus.REQUESTED:
        raise HTTPException(status_code=400, detail="Can only cancel a REQUESTED status book")

    if user.role == UserRole.READER:
        if req.reader_id != user.id:
            raise HTTPException(status_code=403, detail="Not your request")
    elif user.role == UserRole.OWNER:
        book = db.query(Book).filter(Book.id == req.book_id).first()
        lib = db.query(Library).filter(Library.id == book.library_id).first()
        if lib.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Not your library")
    elif user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to cancel requests")

    book = db.query(Book).filter(Book.id == req.book_id).first()
    book.status = BookStatus.AVAILABLE
    db.delete(req)
    db.commit()