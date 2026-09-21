import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile

from models.models import (
    WishRequest, WishRequestType, WishRequestStatus,
    Library, User, UserRole,
)
from schemas.schemas import WishRequestCreate, WishRequestUpdate, WishRequestAccept
from services.book_service import save_image, create_book
from schemas.schemas import BookCreate
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _attach_display_names(db: Session, wr: WishRequest) -> WishRequest:
    """Attach requester_name / target_library_name / reviewed_by_name for the response schema."""
    wr.requester_name = wr.requester.full_name if wr.requester else None
    wr.target_library_name = wr.target_library.name if wr.target_library else None
    wr.reviewed_by_name = wr.reviewed_by.full_name if wr.reviewed_by else None
    return wr


async def create_wish_request(
    db: Session,
    payload: WishRequestCreate,
    requester: User,
    front_image: Optional[UploadFile] = None,
    back_image: Optional[UploadFile] = None,
) -> WishRequest:
    if payload.target_library_id:
        lib = db.query(Library).filter(Library.id == payload.target_library_id, Library.is_active == True).first()
        if not lib:
            raise HTTPException(status_code=404, detail="Selected library not found")

    front_filename = None
    back_filename = None
    if payload.type == WishRequestType.WANT_TO_CONTRIBUTE:
        if front_image and front_image.filename:
            front_filename = await save_image(front_image, settings.UPLOAD_DIR)
        if back_image and back_image.filename:
            back_filename = await save_image(back_image, settings.UPLOAD_DIR)

    wr = WishRequest(
        type=payload.type,
        requester_id=requester.id,
        title=payload.title.strip(),
        author=payload.author.strip(),
        language=payload.language,
        notes=payload.notes,
        age_group=payload.age_group if payload.type == WishRequestType.WANT_TO_READ else None,
        condition=payload.condition if payload.type == WishRequestType.WANT_TO_CONTRIBUTE else None,
        quantity=payload.quantity if payload.type == WishRequestType.WANT_TO_CONTRIBUTE else 1,
        target_library_id=payload.target_library_id,
        front_image=front_filename,
        back_image=back_filename,
        status=WishRequestStatus.PENDING,
    )
    db.add(wr)
    db.commit()
    db.refresh(wr)
    logger.info(f"WishRequest created: #{wr.id} ({wr.type}) by user {requester.id}")
    return _attach_display_names(db, wr)


def get_my_wish_requests(
    db: Session, requester: User, type_: Optional[list], status: Optional[list],
    page: int, page_size: int,
) -> tuple[list, int]:
    query = db.query(WishRequest).filter(WishRequest.requester_id == requester.id)
    if type_:
        query = query.filter(WishRequest.type.in_(type_))
    if status:
        query = query.filter(WishRequest.status.in_(status))
    total = query.count()
    items = (
        query.order_by(WishRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_attach_display_names(db, wr) for wr in items], total


def get_all_wish_requests(
    db: Session,
    type_: Optional[list], status: Optional[list],
    library_id: Optional[int], requester_id: Optional[int],
    page: int, page_size: int,
) -> tuple[list, int]:
    query = db.query(WishRequest)
    if type_:
        query = query.filter(WishRequest.type.in_(type_))
    if status:
        query = query.filter(WishRequest.status.in_(status))
    if library_id:
        query = query.filter(WishRequest.target_library_id == library_id)
    if requester_id:
        query = query.filter(WishRequest.requester_id == requester_id)
    total = query.count()
    items = (
        query.order_by(WishRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_attach_display_names(db, wr) for wr in items], total


def _get_owned_or_404(db: Session, wish_request_id: int, user: User) -> WishRequest:
    wr = db.query(WishRequest).filter(WishRequest.id == wish_request_id).first()
    if not wr:
        raise HTTPException(status_code=404, detail="Request not found")
    if user.role != UserRole.SUPER_ADMIN and wr.requester_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")
    return wr


def get_wish_request(db: Session, wish_request_id: int, user: User) -> WishRequest:
    wr = _get_owned_or_404(db, wish_request_id, user)
    return _attach_display_names(db, wr)


async def update_wish_request(
    db: Session,
    wish_request_id: int,
    payload: WishRequestUpdate,
    user: User,
    front_image: Optional[UploadFile] = None,
    back_image: Optional[UploadFile] = None,
) -> WishRequest:
    wr = db.query(WishRequest).filter(WishRequest.id == wish_request_id).first()
    if not wr:
        raise HTTPException(status_code=404, detail="Request not found")
    if wr.requester_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own requests")
    if wr.status != WishRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="This request is already being processed and can no longer be edited")

    if payload.target_library_id:
        lib = db.query(Library).filter(Library.id == payload.target_library_id, Library.is_active == True).first()
        if not lib:
            raise HTTPException(status_code=404, detail="Selected library not found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(wr, field, value)

    if wr.type == WishRequestType.WANT_TO_CONTRIBUTE:
        if front_image and front_image.filename:
            wr.front_image = await save_image(front_image, settings.UPLOAD_DIR)
        if back_image and back_image.filename:
            wr.back_image = await save_image(back_image, settings.UPLOAD_DIR)

    db.commit()
    db.refresh(wr)
    return _attach_display_names(db, wr)


def reject_wish_request(db: Session, wish_request_id: int, admin_note: Optional[str], admin: User) -> WishRequest:
    wr = db.query(WishRequest).filter(WishRequest.id == wish_request_id).first()
    if not wr:
        raise HTTPException(status_code=404, detail="Request not found")
    if wr.status in (WishRequestStatus.FULFILLED, WishRequestStatus.REJECTED):
        raise HTTPException(status_code=400, detail="This request has already been closed")

    wr.status = WishRequestStatus.REJECTED
    wr.admin_note = admin_note
    wr.reviewed_by_id = admin.id
    wr.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(wr)
    logger.info(f"WishRequest #{wr.id} rejected by admin {admin.id}")
    return _attach_display_names(db, wr)


async def accept_wish_request(
    db: Session,
    wish_request_id: int,
    payload: WishRequestAccept,
    admin: User,
    front_image: Optional[UploadFile] = None,
    back_image: Optional[UploadFile] = None,
) -> WishRequest:
    """Accept a WishRequest and create the corresponding Book(s) in the chosen library.
    If quantity > 1 (contribute requests), creates that many identical Book rows."""
    wr = db.query(WishRequest).filter(WishRequest.id == wish_request_id).first()
    if not wr:
        raise HTTPException(status_code=404, detail="Request not found")
    if wr.status in (WishRequestStatus.FULFILLED, WishRequestStatus.REJECTED):
        raise HTTPException(status_code=400, detail="This request has already been closed")

    lib = db.query(Library).filter(Library.id == payload.library_id, Library.is_active == True).first()
    if not lib:
        raise HTTPException(status_code=404, detail="Selected library not found")

    book_payload = BookCreate(
        title=wr.title,
        author=wr.author,
        genre=payload.genre,
        language=wr.language,
        age_group=payload.age_group,
        description=payload.description,
    )

    quantity = wr.quantity if wr.type == WishRequestType.WANT_TO_CONTRIBUTE else 1
    created_books = []
    for i in range(quantity):
        # Only attach uploaded/override images to the first copy created; duplicates
        # share the same metadata but we avoid re-uploading the same file object twice.
        book = await create_book(
            db, payload.library_id, book_payload, admin,
            front_image if i == 0 else None,
            back_image if i == 0 else None,
        )
        # If the admin didn't upload a fresh image but the contributor already attached
        # one to the wish request, carry that existing image over instead of losing it.
        if i == 0:
            changed = False
            if not (front_image and front_image.filename) and wr.front_image:
                book.front_image = wr.front_image
                changed = True
            if not (back_image and back_image.filename) and wr.back_image:
                book.back_image = wr.back_image
                changed = True
            if changed:
                db.commit()
                db.refresh(book)
        created_books.append(book)

    wr.status = WishRequestStatus.FULFILLED
    wr.reviewed_by_id = admin.id
    wr.reviewed_at = datetime.utcnow()
    wr.book_id = created_books[0].id
    if quantity > 1:
        note = f"{quantity} copies added to catalogue (book IDs {created_books[0].id}-{created_books[-1].id})."
        wr.admin_note = f"{wr.admin_note}\n{note}" if wr.admin_note else note

    db.commit()
    db.refresh(wr)
    logger.info(f"WishRequest #{wr.id} accepted by admin {admin.id}; {quantity} book(s) created in library {payload.library_id}")
    return _attach_display_names(db, wr)