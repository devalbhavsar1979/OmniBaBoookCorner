from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from models.models import UserRole, BookStatus, AgeGroup, WishRequestType, WishRequestStatus, BookCondition


# ─── Auth Schemas ────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


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


class UserUpdate(BaseModel):
    """Basic-info profile edit. Email and password are intentionally excluded —
    they are not editable via this endpoint."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Full name cannot be blank")
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


# ─── Wish Request Schemas ─────────────────────────────────────────────────────
# "Wish Request" = a request for a book NOT in the catalogue yet (want to read)
# or an offer to contribute/donate a book (want to contribute). Distinct from
# BookRequestOut above, which is the borrow-an-existing-catalogue-book workflow.

class WishRequestCreate(BaseModel):
    type: WishRequestType
    title: str
    author: str
    language: str
    notes: Optional[str] = None
    age_group: Optional[AgeGroup] = None          # WANT_TO_READ only
    condition: Optional[BookCondition] = None     # WANT_TO_CONTRIBUTE only
    quantity: int = 1                             # WANT_TO_CONTRIBUTE only
    target_library_id: Optional[int] = None

    @field_validator("title", "author", "language")
    @classmethod
    def not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("This field cannot be blank")
        return v

    @field_validator("quantity")
    @classmethod
    def quantity_at_least_one(cls, v):
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class WishRequestUpdate(BaseModel):
    """Edits allowed only while status is PENDING. Type is immutable after creation."""
    title: Optional[str] = None
    author: Optional[str] = None
    language: Optional[str] = None
    notes: Optional[str] = None
    age_group: Optional[AgeGroup] = None
    condition: Optional[BookCondition] = None
    quantity: Optional[int] = None
    target_library_id: Optional[int] = None


class WishRequestReject(BaseModel):
    admin_note: Optional[str] = None


class WishRequestAccept(BaseModel):
    """Fields the Super Admin fills in to turn a WishRequest into a real catalogue Book."""
    library_id: int
    genre: str
    age_group: AgeGroup = AgeGroup.GENERIC
    description: Optional[str] = None


class WishRequestOut(BaseModel):
    id: int
    type: WishRequestType
    requester_id: int
    requester_name: Optional[str] = None
    title: str
    author: str
    language: str
    notes: Optional[str]
    age_group: Optional[AgeGroup]
    condition: Optional[BookCondition]
    quantity: int
    front_image: Optional[str]
    back_image: Optional[str]
    target_library_id: Optional[int]
    target_library_name: Optional[str] = None
    status: WishRequestStatus
    admin_note: Optional[str]
    reviewed_by_id: Optional[int]
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime]
    book_id: Optional[int]
    book: Optional[BookOut] = None
    created_at: datetime
    updated_at: datetime

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