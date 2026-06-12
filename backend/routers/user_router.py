
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from config.database import get_db
from models.models import User, UserRole
from schemas.schemas import UserOut
from routers.dependencies import require_role

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserOut])
def search_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """
    Search active readers by name or email (owner only).
    Used by the Owner's "Issue Book" flow to find a reader to issue a book to.
    """
    query = db.query(User).filter(User.role == UserRole.READER, User.is_active == True)

    if search:
        like = f"%{search}%"
        query = query.filter(or_(User.full_name.ilike(like), User.email.ilike(like)))

    return query.order_by(User.full_name.asc()).limit(20).all()