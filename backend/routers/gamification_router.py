from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from routers.dependencies import get_current_user
from models.models import User
from schemas.schemas import UserScoreOut
from services import gamification_service

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/me", response_model=UserScoreOut)
def get_my_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current user's Book Coins total, level, badge, and recent activity."""
    return gamification_service.get_user_score(db, current_user.id)
