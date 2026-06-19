import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, ForeignKey,
    Enum as SAEnum, Boolean, Index
)
from sqlalchemy.orm import relationship
from config.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    OWNER = "OWNER"
    READER = "READER"
    VOLUNTEER = "VOLUNTEER"

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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    libraries = relationship("Library", back_populates="owner")
    book_requests = relationship("BookRequest", foreign_keys="BookRequest.reader_id", back_populates="reader")
    volunteer_requests = relationship("BookRequest", foreign_keys="BookRequest.volunteer_id", back_populates="volunteer")


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