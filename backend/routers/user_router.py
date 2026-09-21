from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from config.database import get_db
from models.models import User, UserRole, UserRoleAssignment, RoleRequest, RoleRequestStatus
from schemas.schemas import UserOut, UserApprovalOut, UserUpdate, RoleRequestCreate, RoleApprovalReject
from routers.dependencies import require_role, get_current_user
from services import gamification_service
from services.role_request_service import (
    get_approved_roles,
    get_pending_role_requests,
    approve_role_request,
    reject_role_request,
    create_additional_role_requests,
    get_my_roles,
)

router = APIRouter(prefix="/users", tags=["Users"])


# ── Static routes FIRST (must be above /{user_id}) ───────────────────────────

@router.get("", response_model=list[UserOut])
def search_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.OWNER)),
):
    """Search active readers by name or email (owner / super admin only)."""
    query = db.query(User).filter(
        User.role == UserRole.READER,
        User.is_active == True,
        User.is_approved == True,
    )
    if search:
        like = f"%{search}%"
        query = query.filter(or_(User.full_name.ilike(like), User.email.ilike(like)))
    return query.order_by(User.created_at.desc()).limit(20).all()


@router.get("/all", response_model=list[UserApprovalOut])
def get_all_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """List all approved users — super admin only."""
    query = db.query(User).filter(
        User.role != UserRole.SUPER_ADMIN,
        User.is_approved == True,
    )
    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError:
            pass
    if search:
        like = f"%{search}%"
        query = query.filter(or_(User.full_name.ilike(like), User.email.ilike(like)))
    users = query.order_by(User.created_at.desc()).all()

    # Attach roles in a single query (avoid N+1)
    if users:
        user_ids = [u.id for u in users]
        assignments = db.query(UserRoleAssignment).filter(
            UserRoleAssignment.user_id.in_(user_ids)
        ).all()
        roles_map: dict[int, list[str]] = {}
        for a in assignments:
            roles_map.setdefault(a.user_id, []).append(a.role.value)

        result = []
        for u in users:
            out = UserApprovalOut.model_validate(u)
            out.roles = roles_map.get(u.id, [u.role.value])
            result.append(out)
        return result
    return []


@router.get("/pending", response_model=list[UserApprovalOut])
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Get all users pending account approval (super admin only)."""
    return (
        db.query(User)
        .filter(User.is_approved == False, User.role != UserRole.SUPER_ADMIN)
        .order_by(User.created_at.desc())
        .all()
    )


# ── Role request management ───────────────────────────────────────────────────

@router.get("/role-requests/pending")
def list_pending_role_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """List all pending role requests — super admin only."""
    return get_pending_role_requests(db)


@router.post("/role-requests/{request_id}/approve")
def approve_role_request_endpoint(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Approve a role request — super admin only."""
    return approve_role_request(db, request_id, current_user.id)


@router.post("/role-requests/{request_id}/reject")
def reject_role_request_endpoint(
    request_id: int,
    payload: RoleApprovalReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Reject a role request with optional note — super admin only."""
    return reject_role_request(db, request_id, current_user.id, payload.rejection_note)


# ── Self-service role requests (logged-in user) ───────────────────────────────

@router.get("/me/roles")
def get_my_roles_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's approved roles and pending role requests."""
    return get_my_roles(db, current_user.id)


@router.post("/me/role-requests")
def request_additional_roles(
    payload: RoleRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request one or more additional roles (self-service)."""
    return create_additional_role_requests(db, current_user.id, payload.roles)


# ── Dynamic routes LAST ───────────────────────────────────────────────────────

@router.patch("/{user_id}", response_model=UserApprovalOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Update basic user details — super admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value if (value and str(value).strip()) else None)
    db.commit()
    db.refresh(user)
    out = UserApprovalOut.model_validate(user)
    out.roles = [r.value for r in get_approved_roles(db, user.id)] or [user.role.value]
    return out


@router.get("/{user_id}", response_model=UserApprovalOut)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Get full details of a single user — super admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    out = UserApprovalOut.model_validate(user)
    out.roles = [r.value for r in get_approved_roles(db, user.id)] or [user.role.value]
    return out


@router.post("/{user_id}/approve", response_model=UserApprovalOut)
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Approve a pending user and all their pending role requests."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_approved:
        raise HTTPException(status_code=400, detail="User is already approved")

    user.is_approved = True
    user.is_active = True

    # Approve all pending role requests for this user
    pending_reqs = db.query(RoleRequest).filter(
        RoleRequest.user_id == user_id,
        RoleRequest.status == RoleRequestStatus.PENDING,
    ).all()
    for req in pending_reqs:
        existing = db.query(UserRoleAssignment).filter(
            UserRoleAssignment.user_id == user_id,
            UserRoleAssignment.role == req.role,
        ).first()
        if not existing:
            db.add(UserRoleAssignment(
                user_id=user_id, role=req.role, granted_by_id=current_user.id
            ))
        req.status = RoleRequestStatus.APPROVED
        req.reviewed_at = datetime.utcnow()
        req.reviewed_by_id = current_user.id

    gamification_service.award_points(
        db, user.id, 50, "JOIN_BONUS", "Welcome to Ba Book Corner!"
    )
    db.commit()
    db.refresh(user)
    out = UserApprovalOut.model_validate(user)
    out.roles = [r.value for r in get_approved_roles(db, user.id)] or [user.role.value]
    return out


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
