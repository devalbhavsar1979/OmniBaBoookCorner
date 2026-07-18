from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.schemas import UserRegister, UserLogin, Token, UserOut, UserUpdate, ForgotPasswordRequest, ResetPasswordRequest
from services.auth_service import register_user, authenticate_user, create_access_token, forgot_password, reset_password
from routers.dependencies import get_current_user
from models.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new user (Reader, Owner, or Volunteer)."""
    return register_user(db, payload)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and receive a JWT token."""
    user = authenticate_user(db, payload.email, payload.password)
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the currently authenticated user's basic profile info.
    Email and password cannot be changed through this endpoint."""
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password", status_code=200)
def forgot_password_endpoint(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Send a password reset email. Always returns 200 to avoid leaking emails."""
    base_url = str(request.base_url).rstrip("/")
    # Use frontend URL (port 7000) derived from the request origin or referer if available
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