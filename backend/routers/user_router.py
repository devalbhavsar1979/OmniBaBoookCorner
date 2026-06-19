from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from config.database import get_db
from models.models import User, UserRole
from schemas.schemas import UserOut, UserApprovalOut
from routers.dependencies import require_role

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserOut])
def search_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """Search active readers by name or email (owner / super admin only)."""
    query = db.query(User).filter(User.role == UserRole.READER, User.is_active == True, User.is_approved == True)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(User.full_name.ilike(like), User.email.ilike(like)))
    return query.order_by(User.full_name.asc()).limit(20).all()


@router.get("/pending", response_model=list[UserApprovalOut])
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Get all users pending approval (super admin only)."""
    return (
        db.query(User)
        .filter(User.is_approved == False, User.role != UserRole.SUPER_ADMIN)
        .order_by(User.created_at.desc())
        .all()
    )


@router.post("/{user_id}/approve", response_model=UserApprovalOut)
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Approve a pending user (super admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_approved:
        raise HTTPException(status_code=400, detail="User is already approved")
    user.is_approved = True
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reject", response_model=UserApprovalOut)
def reject_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Reject / delete a pending user registration (super admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_approved:
        raise HTTPException(status_code=400, detail="Cannot reject an already approved user")
    db.delete(user)
    db.commit()
    return user