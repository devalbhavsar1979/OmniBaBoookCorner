from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.schemas import BookRequestCreate, BookRequestOut, PaginatedResponse
from services import request_service
from routers.dependencies import get_current_user
from models.models import User, UserRole, BookStatus

router = APIRouter(prefix="/requests", tags=["Book Requests"])


@router.post("", response_model=BookRequestOut, status_code=201)
def create_request(
    payload: BookRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reader creates a book request."""
    return request_service.create_request(db, payload, current_user)


@router.get("/my/active-count")
def get_active_request_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the reader's active request count and the per-reader limit."""
    count = request_service._count_active_requests(db, current_user.id)
    return {"count": count, "limit": request_service.MAX_ACTIVE_REQUESTS}


@router.get("", response_model=PaginatedResponse)
def list_requests(
    status: Optional[str] = Query(None, description="Comma-separated statuses, e.g. REQUESTED,ISSUED"),
    search: Optional[str] = Query(None, description="Search book title, reader or volunteer name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List requests (role-filtered):
    - Reader: own requests
    - Volunteer: open + assigned requests
    - Owner: requests for books in their libraries
    """
    statuses = None
    if status:
        parsed = []
        for s in status.split(","):
            s = s.strip()
            if s:
                try:
                    parsed.append(BookStatus(s))
                except ValueError:
                    pass
        statuses = parsed or None

    items, total = request_service.get_requests(
        db, current_user, statuses, search or None, page, page_size
    )
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[BookRequestOut.model_validate(r) for r in items],
    )


@router.get("/{request_id}", response_model=BookRequestOut)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific request by ID."""
    return request_service.get_request_by_id(db, request_id, current_user)


@router.post("/{request_id}/advance", response_model=BookRequestOut)
def advance_status(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Advance request to the next status based on caller's role:
    - Volunteer: REQUESTED → REQUEST_ACCEPTED → VOLUNTEER_PICKED → VOLUNTEER_DELIVERED
    - Volunteer (return): RETURN_REQUESTED → RETURN_PICKED → RETURN_DELIVERED
    - Owner: VOLUNTEER_DELIVERED → ISSUED; RETURN_DELIVERED → AVAILABLE
    - Reader: ISSUED → RETURN_REQUESTED
    """
    return request_service.advance_request_status(db, request_id, current_user)


@router.post("/{request_id}/direct-return", response_model=BookRequestOut)
def direct_return(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Library owner or super admin marks an ISSUED book as directly returned (skips volunteer return flow)."""
    return request_service.direct_return_by_admin(db, request_id, current_user)


@router.delete("/{request_id}", status_code=204)
def cancel_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reader cancels a REQUESTED (not yet accepted) book request."""
    request_service.cancel_request(db, request_id, current_user)
