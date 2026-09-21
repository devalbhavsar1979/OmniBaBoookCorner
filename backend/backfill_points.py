"""
Retroactive Book Coins backfill script.

Run once from the backend directory after deploying the gamification feature:

    cd backend
    python backfill_points.py

Safe to re-run: skips rows that already exist.
"""

import sys
import os

# Make sure the app modules are importable when run from backend/
sys.path.insert(0, os.path.dirname(__file__))

from config.database import SessionLocal
from models.models import User, UserRole, BookRequest, Book, PointTransaction, BookStatus
from sqlalchemy import func


def backfill(db):
    total_inserted = 0

    # ── 1. JOIN BONUS (50 BC) ─────────────────────────────────────────────────
    # Every approved, non-super-admin user who doesn't already have one.

    approved_users = (
        db.query(User)
        .filter(User.is_approved == True, User.role != UserRole.SUPER_ADMIN)
        .all()
    )

    join_inserted = 0
    for user in approved_users:
        already = (
            db.query(PointTransaction)
            .filter(
                PointTransaction.user_id == user.id,
                PointTransaction.reason == "JOIN_BONUS",
            )
            .first()
        )
        if already:
            print(f"  [SKIP] JOIN_BONUS already exists for {user.full_name} ({user.email})")
            continue

        tx = PointTransaction(
            user_id=user.id,
            points=50,
            reason="JOIN_BONUS",
            description="Welcome to Ba Book Corner!",
            created_at=user.created_at,   # back-date to when they joined
        )
        db.add(tx)
        join_inserted += 1
        print(f"  [+50 BC] JOIN_BONUS  →  {user.full_name} ({user.email})")

    # ── 2. BOOK ISSUED BONUS (20 BC) ──────────────────────────────────────────
    # One award per book_request that reached ISSUED status.
    # Idempotency: compares the count of existing BOOK_ISSUED transactions
    # for each reader against the count of their issued requests.
    # Only the "extra" requests (ordered by issued_at asc) get new rows.

    issued_requests = (
        db.query(BookRequest, Book)
        .join(Book, Book.id == BookRequest.book_id)
        .filter(BookRequest.issued_at.isnot(None))
        .order_by(BookRequest.reader_id, BookRequest.issued_at.asc(), BookRequest.id.asc())
        .all()
    )

    # Group by reader to apply the idempotent count check
    by_reader: dict[int, list] = {}
    for req, book in issued_requests:
        by_reader.setdefault(req.reader_id, []).append((req, book))

    issue_inserted = 0
    for reader_id, rows in by_reader.items():
        existing_count = (
            db.query(func.count(PointTransaction.id))
            .filter(
                PointTransaction.user_id == reader_id,
                PointTransaction.reason == "BOOK_ISSUED",
            )
            .scalar()
        )

        # Skip the first `existing_count` rows (already recorded); insert the rest
        rows_to_insert = rows[existing_count:]
        for req, book in rows_to_insert:
            tx = PointTransaction(
                user_id=reader_id,
                points=20,
                reason="BOOK_ISSUED",
                description=f"Borrowed: {book.title}",
                created_at=req.issued_at,  # back-date to when book was issued
            )
            db.add(tx)
            issue_inserted += 1
            reader = db.query(User).filter(User.id == reader_id).first()
            print(f"  [+20 BC] BOOK_ISSUED  →  {reader.full_name}  |  {book.title}")

        skipped = existing_count
        if skipped:
            reader = db.query(User).filter(User.id == reader_id).first()
            print(f"  [SKIP] {skipped} BOOK_ISSUED already recorded for {reader.full_name}")

    total_inserted = join_inserted + issue_inserted
    return join_inserted, issue_inserted, total_inserted


def main():
    print("\n" + "=" * 60)
    print("  Ba Book Corner — Retroactive Book Coins Backfill")
    print("=" * 60 + "\n")

    db = SessionLocal()
    try:
        join_n, issue_n, total_n = backfill(db)
        db.commit()
        print("\n" + "-" * 60)
        print(f"  Done.  Inserted {join_n} JOIN_BONUS + {issue_n} BOOK_ISSUED = {total_n} transactions.")
        print("-" * 60 + "\n")
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Rolling back — {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
