from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.schemas import DashboardStats
from services.dashboard_service import get_dashboard_stats
from routers.dependencies import get_current_user
from models.models import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardStats)
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated statistics for the dashboard.

    For Library Owners, statistics are scoped to their own libraries/books/requests.
    For other roles, system-wide statistics are returned.
    """
    return get_dashboard_stats(db, current_user)