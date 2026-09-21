from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from config.database import get_db
from schemas.schemas import (
    WishRequestCreate, WishRequestUpdate, WishRequestOut,
    WishRequestAccept, WishRequestReject, PaginatedResponse,
)
from services import wish_request_service
from routers.dependencies import get_current_user, require_role
from models.models import User, UserRole, WishRequestType, WishRequestStatus, AgeGroup, BookCondition

router = APIRouter(prefix="/wish-requests", tags=["Wish Requests"])


@router.post("", response_model=WishRequestOut, status_code=201)
async def create_wish_request(
    type: WishRequestType = Form(...),
    title: str = Form(...),
    author: str = Form(...),
    language: str = Form(...),
    notes: Optional[str] = Form(None),
    age_group: Optional[AgeGroup] = Form(None),
    condition: Optional[BookCondition] = Form(None),
    quantity: int = Form(1),
    target_library_id: Optional[int] = Form(None),
    front_image: Optional[UploadFile] = File(None),
    back_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Raise a new Wish Request — either 'want to read' (book not in catalogue)
    or 'want to contribute' (donate a book). Available to Reader, Owner, Volunteer."""
    payload = WishRequestCreate(
        type=type, title=title, author=author, language=language, notes=notes,
        age_group=age_group, condition=condition, quantity=quantity,
        target_library_id=target_library_id,
    )
    return await wish_request_service.create_wish_request(db, payload, current_user, front_image, back_image)


def _parse_enum_list(raw: Optional[str], enum_cls):
    if not raw:
        return None
    result = []
    for s in raw.split(','):
        s = s.strip()
        try:
            result.append(enum_cls(s))
        except ValueError:
            pass
    return result or None


@router.get("/me", response_model=PaginatedResponse)
def list_my_wish_requests(
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's own wish requests."""
    types = _parse_enum_list(type, WishRequestType)
    statuses = _parse_enum_list(status, WishRequestStatus)
    items, total = wish_request_service.get_my_wish_requests(db, current_user, types, statuses, page, page_size)
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        items=[WishRequestOut.model_validate(i) for i in items],
    )


@router.get("", response_model=PaginatedResponse)
def list_all_wish_requests(
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    library_id: Optional[int] = Query(None),
    requester_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Super Admin: list every user's wish requests, with optional filters."""
    types = _parse_enum_list(type, WishRequestType)
    statuses = _parse_enum_list(status, WishRequestStatus)
    items, total = wish_request_service.get_all_wish_requests(
        db, types, statuses, library_id, requester_id, page, page_size
    )
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        items=[WishRequestOut.model_validate(i) for i in items],
    )


@router.get("/{wish_request_id}", response_model=WishRequestOut)
def get_wish_request(
    wish_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """View a wish request. Own requests only, unless Super Admin."""
    return wish_request_service.get_wish_request(db, wish_request_id, current_user)


@router.put("/{wish_request_id}", response_model=WishRequestOut)
async def update_wish_request(
    wish_request_id: int,
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    age_group: Optional[AgeGroup] = Form(None),
    condition: Optional[BookCondition] = Form(None),
    quantity: Optional[int] = Form(None),
    target_library_id: Optional[int] = Form(None),
    front_image: Optional[UploadFile] = File(None),
    back_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit your own wish request. Only allowed while status is PENDING."""
    payload = WishRequestUpdate(
        title=title, author=author, language=language, notes=notes,
        age_group=age_group, condition=condition, quantity=quantity,
        target_library_id=target_library_id,
    )
    return await wish_request_service.update_wish_request(db, wish_request_id, payload, current_user, front_image, back_image)


@router.post("/{wish_request_id}/reject", response_model=WishRequestOut)
def reject_wish_request(
    wish_request_id: int,
    payload: WishRequestReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Super Admin: reject a wish request."""
    return wish_request_service.reject_wish_request(db, wish_request_id, payload.admin_note, current_user)


@router.post("/{wish_request_id}/accept", response_model=WishRequestOut)
async def accept_wish_request(
    wish_request_id: int,
    library_id: int = Form(...),
    genre: str = Form(...),
    age_group: AgeGroup = Form(AgeGroup.GENERIC),
    description: Optional[str] = Form(None),
    front_image: Optional[UploadFile] = File(None),
    back_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Super Admin: accept a wish request and add the book to the chosen library's catalogue.
    For WANT_TO_CONTRIBUTE requests with quantity > 1, creates that many identical copies."""
    payload = WishRequestAccept(library_id=library_id, genre=genre, age_group=age_group, description=description)
    return await wish_request_service.accept_wish_request(db, wish_request_id, payload, current_user, front_image, back_image)