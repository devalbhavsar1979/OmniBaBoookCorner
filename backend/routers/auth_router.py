from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.schemas import (
    UserRegister, UserLogin, Token, UserOut, UserUpdate,
    ForgotPasswordRequest, ResetPasswordRequest, SwitchRoleRequest,
)
from services.auth_service import (
    register_user, authenticate_user, create_access_token,
    forgot_password, reset_password, switch_role,
)
from services.role_request_service import get_approved_roles
from routers.dependencies import get_current_user
from models.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _build_token_response(user: User, active_role, roles: list[str]) -> Token:
    token = create_access_token({
        "sub": str(user.id),
        "active_role": active_role.value,
        "roles": roles,
    })
    user_out = UserOut.model_validate(user)
    user_out.roles = roles
    return Token(access_token=token, user=user_out)


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new user. READER is granted immediately; OWNER/VOLUNTEER require approval."""
    user = register_user(db, payload)
    user_out = UserOut.model_validate(user)
    # Populate approved roles for the response
    approved = get_approved_roles(db, user.id)
    user_out.roles = [r.value for r in approved]
    return user_out


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and receive a JWT. Active role defaults to highest approved role."""
    user, active_role, roles = authenticate_user(db, payload.email, payload.password)
    return _build_token_response(user, active_role, roles)


@router.post("/switch-role", response_model=Token)
def switch_role_endpoint(
    payload: SwitchRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Switch the active role for the current session. Issues a new JWT."""
    user, active_role, roles = switch_role(db, current_user, payload.role)
    return _build_token_response(user, active_role, roles)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    user_out = UserOut.model_validate(current_user)
    user_out.roles = getattr(current_user, "_jwt_roles", [current_user.role.value])
    return user_out


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update profile info. Email and password cannot be changed here."""
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    user_out = UserOut.model_validate(current_user)
    user_out.roles = getattr(current_user, "_jwt_roles", [current_user.role.value])
    return user_out


@router.post("/forgot-password", status_code=200)
def forgot_password_endpoint(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Send a password reset email. Always returns 200 to avoid leaking emails."""
    base_url = str(request.base_url).rstrip("/")
    origin = request.headers.get("origin") or request.headers.get("referer", "")
    if origin:
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
    forgot_password(db, payload.email, base_url)
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password", status_code=200)
def reset_password_endpoint(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using the token from the email link."""
    reset_password(db, payload.token, payload.new_password)
    return {"message": "Password reset successfully. You can now log in."}
