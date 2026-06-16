from sqlalchemy.orm import Session
from sqlalchemy import func
from models.models import Library, Book, BookRequest, User, UserRole
from schemas.schemas import DashboardStats, StatusCount, GenreCount, LanguageCount, AuthorCount


def get_dashboard_stats(db: Session, current_user: User) -> DashboardStats:
    """
    Build dashboard statistics.

    - Library Owners: all stats (libraries, books, requests, charts) are scoped
      to their own libraries only.
    - Other roles (Reader / Volunteer): system-wide stats are shown.
    - "total_users" (displayed as "Readers") always shows the count of all
      registered, active Readers in the system, regardless of role.
    """
    is_owner = current_user.role == UserRole.OWNER    book_query = db.query(Book)
    request_query = db.query(BookRequest)

    if is_owner:
        owner_library_ids = db.query(Library.id).filter(
            Library.owner_id == current_user.id,
            Library.is_active == True,
        )

        total_libraries = db.query(func.count(Library.id)).filter(
            Library.owner_id == current_user.id,
            Library.is_active == True,
        ).scalar()

        book_query = book_query.filter(Book.library_id.in_(owner_library_ids))
        request_query = request_query.join(Book, BookRequest.book_id == Book.id).filter(
            Book.library_id.in_(owner_library_ids)
        )
    else:
        total_libraries = db.query(func.count(Library.id)).filter(Library.is_active == True).scalar()

    total_books = book_query.with_entities(func.count(Book.id)).scalar()
    total_requests = request_query.with_entities(func.count(BookRequest.id)).scalar()

    # "Readers" — count of all registered, active readers in the system
    total_readers = db.query(func.count(User.id)).filter(
        User.role == UserRole.READER,
        User.is_active == True,
    ).scalar()

    books_by_status_raw = (
        book_query.with_entities(Book.status, func.count(Book.id))
        .group_by(Book.status)
        .all()
    )
    books_by_status = [StatusCount(status=s.value, count=c) for s, c in books_by_status_raw]

    books_by_genre_raw = (
        book_query.with_entities(Book.genre, func.count(Book.id))
        .group_by(Book.genre)
        .order_by(func.count(Book.id).desc())
        .limit(10)
        .all()
    )
    books_by_genre = [GenreCount(genre=g, count=c) for g, c in books_by_genre_raw]

    books_by_language_raw = (
        book_query.with_entities(Book.language, func.count(Book.id))
        .group_by(Book.language)
        .order_by(func.count(Book.id).desc())
        .all()
    )
    books_by_language = [LanguageCount(language=l, count=c) for l, c in books_by_language_raw]

    books_by_author_raw = (
        book_query.with_entities(Book.author, func.count(Book.id))
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
        total_users=total_readers,
        books_by_status=books_by_status,
        books_by_genre=books_by_genre,
        books_by_language=books_by_language,
        books_by_author=books_by_author,
    )