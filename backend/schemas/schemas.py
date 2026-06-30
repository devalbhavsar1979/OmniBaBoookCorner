from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from models.models import UserRole, BookStatus, AgeGroup


# ─── Auth Schemas ────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    role: UserRole

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str]
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    role: UserRole
    is_active: bool
    is_approved: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class UserApprovalOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str]
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    role: UserRole
    is_active: bool
    is_approved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Library Schemas ──────────────────────────────────────────────────────────

class LibraryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    city: str
    state: str
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


class LibraryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None


class LibraryOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    address: str
    city: str
    state: str
    pincode: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    owner_id: int
    owner_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    book_count: Optional[int] = 0

    model_config = {"from_attributes": True}


# ─── Book Schemas ─────────────────────────────────────────────────────────────

class BookCreate(BaseModel):
    title: str
    author: str
    genre: str
    language: str
    age_group: AgeGroup = AgeGroup.GENERIC
    description: Optional[str] = None


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    genre: Optional[str] = None
    language: Optional[str] = None
    age_group: Optional[AgeGroup] = None
    description: Optional[str] = None


class BookOut(BaseModel):
    id: int
    title: str
    author: str
    genre: str
    language: str
    age_group: AgeGroup = AgeGroup.GENERIC
    description: Optional[str]
    front_image: Optional[str]
    back_image: Optional[str]
    status: BookStatus
    library_id: int
    library_name: Optional[str] = None
    library_owner_name: Optional[str] = None
    issued_to_reader_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookWithLibrary(BookOut):
    library: Optional[LibraryOut] = None


# ─── Request Schemas ──────────────────────────────────────────────────────────

class BookRequestCreate(BaseModel):
    book_id: int
    delivery_address: str
    delivery_notes: Optional[str] = None


class BookIssueRequest(BaseModel):
    reader_id: int
    delivery_address: str
    delivery_notes: Optional[str] = None


class BookRequestOut(BaseModel):
    id: int
    book_id: int
    reader_id: int
    volunteer_id: Optional[int]
    delivery_address: str
    delivery_notes: Optional[str]
    status: BookStatus
    requested_at: datetime
    accepted_at: Optional[datetime]
    picked_at: Optional[datetime]
    delivered_at: Optional[datetime]
    issued_at: Optional[datetime]
    return_requested_at: Optional[datetime]
    return_picked_at: Optional[datetime]
    return_delivered_at: Optional[datetime]
    closed_at: Optional[datetime]
    updated_at: datetime
    book: Optional[BookOut] = None
    reader: Optional[UserOut] = None
    volunteer: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class StatusCount(BaseModel):
    status: str
    count: int


class GenreCount(BaseModel):
    genre: str
    count: int


class LanguageCount(BaseModel):
    language: str
    count: int


class AuthorCount(BaseModel):
    author: str
    count: int


class DashboardStats(BaseModel):
    total_libraries: int
    total_books: int
    total_requests: int
    total_users: int
    books_by_status: list[StatusCount]
    books_by_genre: list[GenreCount]
    books_by_language: list[LanguageCount]
    books_by_author: list[AuthorCount]


# ─── Pagination ───────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list


Token.model_rebuild()