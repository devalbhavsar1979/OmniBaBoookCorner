from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.schemas import LibraryCreate, LibraryUpdate, LibraryOut, PaginatedResponse
from services import library_service
from routers.dependencies import get_current_user, require_role
from models.models import User, UserRole

router = APIRouter(prefix="/libraries", tags=["Libraries"])


@router.post("", response_model=LibraryOut, status_code=201)
def create_library(
    payload: LibraryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """Create a new library. Owner only."""
    return library_service.create_library(db, payload, current_user)


@router.get("", response_model=PaginatedResponse)
def list_libraries(
    search: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List libraries:
    - OWNER: only their own libraries
    - READER / VOLUNTEER: all active libraries
    """
    if current_user.role == UserRole.OWNER:
        # Owners see only their own libraries
        items = library_service.get_my_libraries(db, current_user)
        # Apply search/city filter in Python (list is small per owner)
        if search:
            items = [l for l in items if search.lower() in l.name.lower()]
        if city:
            items = [l for l in items if city.lower() in l.city.lower()]
        total = len(items)
        start = (page - 1) * page_size
        items = items[start: start + page_size]
    else:
        items, total = library_service.get_libraries(db, search, city, page, page_size)

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[LibraryOut.model_validate(lib) for lib in items],
    )


@router.get("/mine", response_model=list[LibraryOut])
def my_libraries(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """Get libraries owned by the authenticated owner."""
    return library_service.get_my_libraries(db, current_user)


@router.get("/{library_id}", response_model=LibraryOut)
def get_library(
    library_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific library by ID. Owners can only fetch their own libraries."""
    lib = library_service.get_library_by_id(db, library_id)
    if current_user.role == UserRole.OWNER and lib.owner_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not authorized to view this library")
    return lib


@router.put("/{library_id}", response_model=LibraryOut)
def update_library(
    library_id: int,
    payload: LibraryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """Update a library. Owner only."""
    return library_service.update_library(db, library_id, payload, current_user)


@router.delete("/{library_id}", status_code=204)
def delete_library(
    library_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """Soft-delete a library. Owner only."""
    library_service.delete_library(db, library_id, current_user)
