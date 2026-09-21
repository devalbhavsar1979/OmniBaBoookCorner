import logging
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.models import PointTransaction

logger = logging.getLogger(__name__)

LEVELS = [
    {"level": 1, "name": "Page Turner",    "emoji": "📄", "color": "#10B981", "min_points": 50,   "next_at": 200},
    {"level": 2, "name": "Avid Reader",    "emoji": "📖", "color": "#3B82F6", "min_points": 200,  "next_at": 500},
    {"level": 3, "name": "Bookworm",       "emoji": "🐛", "color": "#8B5CF6", "min_points": 500,  "next_at": 700},
    {"level": 4, "name": "Literary Scout", "emoji": "🔭", "color": "#F59E0B", "min_points": 700,  "next_at": 1000},
    {"level": 5, "name": "Book Guru",      "emoji": "🧘", "color": "#EF4444", "min_points": 1000, "next_at": None},
]


def get_level_info(total_points: int) -> dict:
    current = None
    for lvl in reversed(LEVELS):
        if total_points >= lvl["min_points"]:
            current = lvl
            break

    if current is None:
        next_lvl = LEVELS[0]
        return {
            "level": 0,
            "name": "Newcomer",
            "emoji": "🌱",
            "color": "#9CA3AF",
            "points_in_level": total_points,
            "points_for_level": next_lvl["min_points"],
            "progress_pct": round((total_points / next_lvl["min_points"]) * 100) if next_lvl["min_points"] else 0,
            "next_level_name": next_lvl["name"],
            "next_level_at": next_lvl["min_points"],
        }

    idx = LEVELS.index(current)
    if idx + 1 < len(LEVELS):
        next_lvl = LEVELS[idx + 1]
        span = next_lvl["min_points"] - current["min_points"]
        earned = total_points - current["min_points"]
        return {
            "level": current["level"],
            "name": current["name"],
            "emoji": current["emoji"],
            "color": current["color"],
            "points_in_level": earned,
            "points_for_level": span,
            "progress_pct": min(round((earned / span) * 100), 100),
            "next_level_name": next_lvl["name"],
            "next_level_at": next_lvl["min_points"],
        }
    else:
        return {
            "level": current["level"],
            "name": current["name"],
            "emoji": current["emoji"],
            "color": current["color"],
            "points_in_level": total_points - current["min_points"],
            "points_for_level": None,
            "progress_pct": 100,
            "next_level_name": None,
            "next_level_at": None,
        }


def award_points(db: Session, user_id: int, points: int, reason: str, description: str = "") -> None:
    """Add a point transaction. Caller must commit the session."""
    tx = PointTransaction(
        user_id=user_id,
        points=points,
        reason=reason,
        description=description,
    )
    db.add(tx)
    logger.info(f"Queued {points} BC for user {user_id} — {reason}")


def get_user_score(db: Session, user_id: int) -> dict:
    total_points = db.query(func.sum(PointTransaction.points)).filter(
        PointTransaction.user_id == user_id
    ).scalar() or 0

    recent_transactions = (
        db.query(PointTransaction)
        .filter(PointTransaction.user_id == user_id)
        .order_by(PointTransaction.created_at.desc())
        .limit(20)
        .all()
    )

    return {
        "user_id": user_id,
        "total_points": total_points,
        "level_info": get_level_info(total_points),
        "all_levels": LEVELS,
        "recent_transactions": recent_transactions,
    }
