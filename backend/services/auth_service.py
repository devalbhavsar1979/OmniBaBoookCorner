import logging
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.models import User, UserRole, UserRoleAssignment, RoleRequest, RoleRequestStatus
from schemas.schemas import UserRegister
from config.settings import get_settings
from services.role_request_service import (
    ROLE_PRIORITY, INSTANTLY_GRANTED,
    get_highest_role, get_approved_roles,
)

logger = logging.getLogger(__name__)
settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12, truncate_error=False)

ALGORITHM = "HS256"


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def register_user(db: Session, payload: UserRegister) -> User:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    immediate_roles = [r for r in payload.roles if r in INSTANTLY_GRANTED]
    pending_roles = [r for r in payload.roles if r not in INSTANTLY_GRANTED]

    primary_role = get_highest_role(immediate_roles) or payload.roles[0]
    has_immediate = bool(immediate_roles)

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        address_line=payload.address_line,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        heard_from=payload.heard_from,
        hashed_password=hash_password(payload.password),
        role=primary_role,
        is_active=has_immediate,
        is_approved=has_immediate,
    )
    db.add(user)
    db.flush()

    for role in immediate_roles:
        db.add(UserRoleAssignment(user_id=user.id, role=role))

    for role in pending_roles:
        db.add(RoleRequest(user_id=user.id, role=role, status=RoleRequestStatus.PENDING))

    db.commit()
    db.refresh(user)
    logger.info(f"New user registered: {user.email} immediate={immediate_roles} pending={pending_roles}")
    return user


def authenticate_user(db: Session, email: str, password: str) -> tuple[User, UserRole, list[str]]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # SUPER_ADMIN bypasses role assignment system
    if user.role == UserRole.SUPER_ADMIN:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Your account has been deactivated.")
        return user, UserRole.SUPER_ADMIN, [UserRole.SUPER_ADMIN.value]

    # Fully deactivated users (approved then disabled)
    if not user.is_active and user.is_approved:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")

    approved_roles = get_approved_roles(db, user.id)

    # Legacy backfill: users created before multi-role feature
    if not approved_roles and user.is_approved and user.is_active:
        db.add(UserRoleAssignment(user_id=user.id, role=user.role))
        db.commit()
        approved_roles = [user.role]

    if not approved_roles:
        pending_count = db.query(RoleRequest).filter(
            RoleRequest.user_id == user.id,
            RoleRequest.status == RoleRequestStatus.PENDING,
        ).count()
        if pending_count > 0:
            raise HTTPException(
                status_code=403,
                detail="Your account is pending approval by the Super Admin. Please wait.",
            )
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")

    # Determine active role: use last_active_role if still valid, else highest
    if user.last_active_role and user.last_active_role in approved_roles:
        active_role = user.last_active_role
    else:
        active_role = get_highest_role(approved_roles)

    user.role = active_role
    return user, active_role, [r.value for r in approved_roles]


def switch_role(db: Session, user: User, new_role: UserRole) -> tuple[User, UserRole, list[str]]:
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="SUPER_ADMIN cannot switch roles")

    approved_roles = get_approved_roles(db, user.id)
    if new_role not in approved_roles:
        raise HTTPException(status_code=403, detail="You do not hold this role")

    db_user = db.query(User).filter(User.id == user.id).first()
    db_user.last_active_role = new_role
    db.commit()

    db_user.role = new_role
    return db_user, new_role, [r.value for r in approved_roles]


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id, User.is_active == True).first()


def forgot_password(db: Session, email: str, reset_base_url: str) -> bool:
    import secrets
    from services.email_service import send_password_reset_email

    user = db.query(User).filter(User.email == email).first()
    if not user:
        return True

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    reset_url = f"{reset_base_url}/reset-password?token={token}"
    send_password_reset_email(user.email, user.full_name, reset_url)
    logger.info(f"Password reset requested for {email}")
    return True


def reset_password(db: Session, token: str, new_password: str) -> User:
    user = db.query(User).filter(User.reset_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
    if user.reset_token_expires is None or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")

    user.hashed_password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    db.refresh(user)
    logger.info(f"Password reset successfully for {user.email}")
    return user
