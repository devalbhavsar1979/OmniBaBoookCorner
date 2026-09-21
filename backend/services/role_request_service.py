import logging
from datetime import datetime
from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.models import (
    User, UserRole, UserRoleAssignment, RoleRequest, RoleRequestStatus
)

logger = logging.getLogger(__name__)

ROLE_PRIORITY = {
    UserRole.SUPER_ADMIN: 4,
    UserRole.OWNER: 3,
    UserRole.VOLUNTEER: 2,
    UserRole.READER: 1,
}

INSTANTLY_GRANTED = {UserRole.READER}


def get_highest_role(roles: list[UserRole]) -> Optional[UserRole]:
    if not roles:
        return None
    return max(roles, key=lambda r: ROLE_PRIORITY.get(r, 0))


def get_approved_roles(db: Session, user_id: int) -> list[UserRole]:
    return [
        a.role for a in
        db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == user_id).all()
    ]


def _role_request_dict(req: RoleRequest) -> dict:
    return {
        "id": req.id,
        "user_id": req.user_id,
        "user_name": req.user.full_name,
        "user_email": req.user.email,
        "role": req.role.value,
        "status": req.status.value,
        "requested_at": req.requested_at.isoformat(),
        "reviewed_at": req.reviewed_at.isoformat() if req.reviewed_at else None,
        "rejection_note": req.rejection_note,
    }


def get_pending_role_requests(db: Session) -> list[dict]:
    requests = (
        db.query(RoleRequest)
        .filter(RoleRequest.status == RoleRequestStatus.PENDING)
        .order_by(RoleRequest.requested_at.asc())
        .all()
    )
    return [_role_request_dict(r) for r in requests]


def approve_role_request(db: Session, request_id: int, admin_id: int) -> dict:
    req = db.query(RoleRequest).filter(RoleRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Role request not found")
    if req.status != RoleRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Role request is not pending")

    existing = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == req.user_id,
        UserRoleAssignment.role == req.role,
    ).first()
    if not existing:
        db.add(UserRoleAssignment(user_id=req.user_id, role=req.role, granted_by_id=admin_id))

    req.status = RoleRequestStatus.APPROVED
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by_id = admin_id

    user = db.query(User).filter(User.id == req.user_id).first()
    if user and not user.is_approved:
        user.is_approved = True
        user.is_active = True

    db.commit()
    logger.info(f"Role request {request_id} approved: user {req.user_id} → {req.role.value}")
    return {"approved": True, "user_id": req.user_id, "role": req.role.value}


def reject_role_request(db: Session, request_id: int, admin_id: int, note: Optional[str]) -> dict:
    req = db.query(RoleRequest).filter(RoleRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Role request not found")
    if req.status != RoleRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Role request is not pending")

    req.status = RoleRequestStatus.REJECTED
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by_id = admin_id
    req.rejection_note = note

    db.commit()
    logger.info(f"Role request {request_id} rejected: user {req.user_id} → {req.role.value}")
    return {"rejected": True, "user_id": req.user_id, "role": req.role.value}


def create_additional_role_requests(db: Session, user_id: int, roles: list[UserRole]) -> list[dict]:
    results = []
    for role in roles:
        if role == UserRole.SUPER_ADMIN:
            continue

        existing_assignment = db.query(UserRoleAssignment).filter(
            UserRoleAssignment.user_id == user_id,
            UserRoleAssignment.role == role,
        ).first()
        if existing_assignment:
            results.append({"role": role.value, "status": "already_assigned"})
            continue

        existing_req = db.query(RoleRequest).filter(
            RoleRequest.user_id == user_id,
            RoleRequest.role == role,
            RoleRequest.status == RoleRequestStatus.PENDING,
        ).first()
        if existing_req:
            results.append({"role": role.value, "status": "already_pending"})
            continue

        if role in INSTANTLY_GRANTED:
            db.add(UserRoleAssignment(user_id=user_id, role=role))
            results.append({"role": role.value, "status": "granted"})
        else:
            db.add(RoleRequest(user_id=user_id, role=role, status=RoleRequestStatus.PENDING))
            results.append({"role": role.value, "status": "pending"})

    db.commit()
    return results


def get_my_roles(db: Session, user_id: int) -> dict:
    assignments = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == user_id
    ).all()

    recent_requests = (
        db.query(RoleRequest)
        .filter(RoleRequest.user_id == user_id)
        .order_by(RoleRequest.requested_at.desc())
        .limit(20)
        .all()
    )

    return {
        "approved_roles": [a.role.value for a in assignments],
        "requests": [
            {
                "id": r.id,
                "role": r.role.value,
                "status": r.status.value,
                "requested_at": r.requested_at.isoformat(),
                "rejection_note": r.rejection_note,
            }
            for r in recent_requests
        ],
    }
