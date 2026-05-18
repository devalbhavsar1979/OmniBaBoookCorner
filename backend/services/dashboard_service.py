from sqlalchemy.orm import Session
from sqlalchemy import func
from models.models import Library, Book, BookRequest, User, BookStatus
from schemas.schemas import DashboardStats, StatusCount, GenreCount, LanguageCount, AuthorCount


def get_dashboard_stats(db: Session) -> DashboardStats:
    total_libraries = db.query(func.count(Library.id)).filter(Library.is_active == True).scalar()
    total_books = db.query(func.count(Book.id)).scalar()
    total_requests = db.query(func.count(BookRequest.id)).scalar()
    total_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()

    books_by_status_raw = (
        db.query(Book.status, func.count(Book.id))
        .group_by(Book.status)
        .all()
    )
    books_by_status = [StatusCount(status=s.value, count=c) for s, c in books_by_status_raw]

    books_by_genre_raw = (
        db.query(Book.genre, func.count(Book.id))
        .group_by(Book.genre)
        .order_by(func.count(Book.id).desc())
        .limit(10)
        .all()
    )
    books_by_genre = [GenreCount(genre=g, count=c) for g, c in books_by_genre_raw]

    books_by_language_raw = (
        db.query(Book.language, func.count(Book.id))
        .group_by(Book.language)
        .order_by(func.count(Book.id).desc())
        .all()
    )
    books_by_language = [LanguageCount(language=l, count=c) for l, c in books_by_language_raw]

    books_by_author_raw = (
        db.query(Book.author, func.count(Book.id))
        .group_by(Book.author)
        .order_by(func.count(Book.id).desc())
        .limit(10)
        .all()
    )
    books_by_author = [AuthorCount(author=a, count=c) for a, c in books_by_author_raw]

    return DashboardStats(
        total_libraries=total_libraries,
        total_books=total_books,
        total_requests=total_requests,
        total_users=total_users,
        books_by_status=books_by_status,
        books_by_genre=books_by_genre,
        books_by_language=books_by_language,
        books_by_author=books_by_author,
    )
