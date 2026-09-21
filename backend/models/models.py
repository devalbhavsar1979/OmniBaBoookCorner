import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, ForeignKey,
    Enum as SAEnum, Boolean, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from config.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    OWNER = "OWNER"
    READER = "READER"
    VOLUNTEER = "VOLUNTEER"


class RoleRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class BookStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    REQUESTED = "REQUESTED"
    REQUEST_ACCEPTED = "REQUEST_ACCEPTED"
    VOLUNTEER_PICKED = "VOLUNTEER_PICKED"
    VOLUNTEER_DELIVERED = "VOLUNTEER_DELIVERED"
    ISSUED = "ISSUED"
    RETURN_REQUESTED = "RETURN_REQUESTED"
    RETURN_PICKED = "RETURN_PICKED"
    RETURN_DELIVERED = "RETURN_DELIVERED"


class AgeGroup(str, enum.Enum):
    GENERIC   = "GENERIC"
    TODDLER   = "TODDLER"
    CHILDREN  = "CHILDREN"
    TEENAGER  = "TEENAGER"
    ADULT     = "ADULT"


class WishRequestType(str, enum.Enum):
    WANT_TO_READ = "WANT_TO_READ"
    WANT_TO_CONTRIBUTE = "WANT_TO_CONTRIBUTE"


class WishRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    FULFILLED = "FULFILLED"
    REJECTED = "REJECTED"


class BookCondition(str, enum.Enum):
    NEW = "NEW"
    GOOD = "GOOD"
    FAIR = "FAIR"
    WORN = "WORN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    address_line = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    role = Column(SAEnum(UserRole), nullable=False)
    last_active_role = Column(SAEnum(UserRole), nullable=True)
    heard_from = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    libraries = relationship("Library", back_populates="owner")
    book_requests = relationship("BookRequest", foreign_keys="BookRequest.reader_id", back_populates="reader")
    volunteer_requests = relationship("BookRequest", foreign_keys="BookRequest.volunteer_id", back_populates="volunteer")
    role_assignments = relationship("UserRoleAssignment", foreign_keys="UserRoleAssignment.user_id", back_populates="user")


class Library(Base):
    __tablename__ = "libraries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="libraries")
    books = relationship("Book", back_populates="library")

    __table_args__ = (
        Index("idx_library_city", "city"),
        Index("idx_library_owner", "owner_id"),
    )


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    author = Column(String(300), nullable=False)
    genre = Column(String(100), nullable=False)
    language = Column(String(100), nullable=False)
    age_group = Column(SAEnum(AgeGroup), default=AgeGroup.GENERIC, nullable=False)
    description = Column(Text, nullable=True)
    front_image = Column(String(500), nullable=True)
    back_image = Column(String(500), nullable=True)
    status = Column(SAEnum(BookStatus), default=BookStatus.AVAILABLE, nullable=False)
    library_id = Column(Integer, ForeignKey("libraries.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    library = relationship("Library", back_populates="books")
    requests = relationship("BookRequest", back_populates="book")

    __table_args__ = (
        Index("idx_book_library", "library_id"),
        Index("idx_book_status", "status"),
        Index("idx_book_genre", "genre"),
        Index("idx_book_language", "language"),
        Index("idx_book_title", "title"),
    )


class BookRequest(Base):
    __tablename__ = "book_requests"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    reader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    volunteer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    delivery_address = Column(Text, nullable=False)
    delivery_notes = Column(Text, nullable=True)
    status = Column(SAEnum(BookStatus), default=BookStatus.REQUESTED, nullable=False)
    requested_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    picked_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    issued_at = Column(DateTime, nullable=True)
    return_requested_at = Column(DateTime, nullable=True)
    return_picked_at = Column(DateTime, nullable=True)
    return_delivered_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    book = relationship("Book", back_populates="requests")
    reader = relationship("User", foreign_keys=[reader_id], back_populates="book_requests")
    volunteer = relationship("User", foreign_keys=[volunteer_id], back_populates="volunteer_requests")

    __table_args__ = (
        Index("idx_request_reader", "reader_id"),
        Index("idx_request_volunteer", "volunteer_id"),
        Index("idx_request_book", "book_id"),
        Index("idx_request_status", "status"),
    )


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    points = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_pt_user", "user_id"),
    )


class WishRequest(Base):
    """A user-initiated request that is NOT tied to an existing catalogue book —
    either 'I want to read a book that isn't in BoookCorner yet' or
    'I want to contribute/donate a book to a library'.

    Deliberately named WishRequest (not BookRequest) to avoid clashing with the
    existing BookRequest model above, which handles borrowing an already-catalogued book."""
    __tablename__ = "wish_requests"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(SAEnum(WishRequestType), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(500), nullable=False)
    author = Column(String(300), nullable=False)
    language = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)

    # WANT_TO_READ only
    age_group = Column(SAEnum(AgeGroup), nullable=True)

    # WANT_TO_CONTRIBUTE only
    condition = Column(SAEnum(BookCondition), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    front_image = Column(String(500), nullable=True)
    back_image = Column(String(500), nullable=True)

    # Requester's suggested library (optional — "any library" if left blank)
    target_library_id = Column(Integer, ForeignKey("libraries.id"), nullable=True)

    status = Column(SAEnum(WishRequestStatus), default=WishRequestStatus.PENDING, nullable=False)
    admin_note = Column(Text, nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Set when accepted — points at the (first, if multiple copies) Book created in the catalogue
    book_id = Column(Integer, ForeignKey("books.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    requester = relationship("User", foreign_keys=[requester_id])
    target_library = relationship("Library", foreign_keys=[target_library_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    book = relationship("Book", foreign_keys=[book_id])

    __table_args__ = (
        Index("idx_wishreq_requester", "requester_id"),
        Index("idx_wishreq_status", "status"),
        Index("idx_wishreq_type", "type"),
    )


class UserRoleAssignment(Base):
    """Approved roles held by a user. Many-to-many between users and roles."""
    __tablename__ = "user_role_assignments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    granted_at = Column(DateTime, default=datetime.utcnow)
    granted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="role_assignments")
    granted_by = relationship("User", foreign_keys=[granted_by_id])

    __table_args__ = (
        UniqueConstraint("user_id", "role", name="uq_user_role"),
        Index("idx_ura_user", "user_id"),
    )


class RoleRequest(Base):
    """A user's request for a role that requires admin approval."""
    __tablename__ = "role_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    status = Column(SAEnum(RoleRequestStatus), default=RoleRequestStatus.PENDING, nullable=False)
    requested_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejection_note = Column(Text, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])

    __table_args__ = (
        Index("idx_rr_user", "user_id"),
        Index("idx_rr_status", "status"),
    )