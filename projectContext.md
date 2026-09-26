# BaBookCorner — Full Project Context

> Last updated: 2026-09-13  
> Purpose: Complete reference for AI-assisted development. Covers architecture, models, API, frontend, features, business rules, and conventions.

---

## 1. Project Overview

**Ba Book Corner** is a library management system built for the Ba Foundation to promote book reading. It allows multiple libraries (Book Corners) to catalogue books, readers to borrow them, volunteers to deliver/return them, and a Super Admin to oversee everything.

- **Domain**: `app.boookcorner.in`
- **Server IP**: `43.249.231.181`
- **OS**: Windows Server 2022 Standard

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13, FastAPI, SQLAlchemy ORM, Pydantic v2 |
| Database | PostgreSQL |
| Frontend | React 18, React Router v6, Axios |
| Maps | Leaflet + react-leaflet v4, OpenStreetMap tiles, OSRM (routing), Nominatim (geocoding) |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Images | Pillow (PIL), multipart/form-data uploads |
| Email | Custom email_service (SMTP) |
| Process Manager | NSSM (Non-Sucking Service Manager) for Windows services |
| ISBN Lookup | Open Library API |

### Ports
- **Backend**: `1000` (FastAPI via Uvicorn)
- **Frontend**: `7000` (serve static React build)
- **Frontend proxy** (dev): `http://localhost:1000` (in `package.json`)

### Services (NSSM)
```
BaBookCorner-Backend   → runs Uvicorn on port 1000
BaBookCorner-Frontend  → serves React build on port 7000
```
Restart commands:
```powershell
nssm restart BaBookCorner-Backend
nssm restart BaBookCorner-Frontend
```
Frontend build command: `cd C:\Relisant\BaBookCorner\frontend; npm run build`

---

## 3. Directory Structure

```
BaBookCorner/
├── backend/
│   ├── main.py                    # FastAPI app, CORS, router registration
│   ├── config/
│   │   ├── database.py            # SQLAlchemy engine + session + Base
│   │   └── settings.py            # Pydantic Settings (env vars)
│   ├── models/
│   │   └── models.py              # All SQLAlchemy ORM models + enums
│   ├── schemas/
│   │   └── schemas.py             # All Pydantic request/response schemas
│   ├── routers/
│   │   ├── auth_router.py         # /auth/*
│   │   ├── book_router.py         # /books/*
│   │   ├── dashboard_router.py    # /dashboard
│   │   ├── dependencies.py        # get_current_user, require_role
│   │   ├── gamification_router.py # /gamification/*
│   │   ├── issue_register_router.py # /admin/issue-register/*
│   │   ├── library_router.py      # /libraries/*
│   │   ├── public_router.py       # /public/* (no auth)
│   │   ├── request_router.py      # /requests/*
│   │   ├── user_router.py         # /users/*
│   │   └── wish_request_router.py # /wish-requests/*
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── book_service.py
│   │   ├── dashboard_service.py
│   │   ├── email_service.py
│   │   ├── gamification_service.py
│   │   ├── isbn_service.py
│   │   ├── issue_register_service.py
│   │   ├── library_service.py
│   │   ├── request_service.py
│   │   ├── role_request_service.py
│   │   ├── scan_service.py
│   │   └── wish_request_service.py
│   └── alembic/                   # DB migrations (rarely used — app uses create_all)
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js                 # Routes definition
│   │   ├── index.css              # Global CSS + design tokens
│   │   ├── context/
│   │   │   └── AuthContext.js     # Auth state, login/logout/switchRole
│   │   ├── components/
│   │   │   ├── Layout.js          # Sidebar, mobile nav, profile menu
│   │   │   ├── common.js          # Spinner, Alert, Modal, Pagination, StatusBadge, etc.
│   │   │   ├── ProfileModal.js    # Profile view/edit modal
│   │   │   ├── UserSearchPopup.js # Owner issues book to a reader (search popup)
│   │   │   └── WishRequestAcceptModal.js # Admin accepts a wish request
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js    # 2-step registration with role selection + heard_from
│   │   │   ├── ForgotPasswordPage.js
│   │   │   ├── ResetPasswordPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── LibrariesPage.js
│   │   │   ├── BooksPage.js       # Book catalogue with filters, request, issue
│   │   │   ├── RequestsPage.js    # Borrow request tracking (all roles)
│   │   │   ├── BookRequestsPage.js # Wishlist (want to read / want to contribute)
│   │   │   ├── UserPage.js        # Admin user management
│   │   │   ├── PendingApprovalsPage.js
│   │   │   ├── MyScorePage.js     # Gamification / points
│   │   │   ├── IssueRegisterPage.js
│   │   │   └── PublicBooksPage.js # Unauthenticated book catalogue
│   │   └── services/
│   │       └── api.js             # Axios instance + all API helpers
│   └── package.json
└── projectContext.md              # This file
```

---

## 4. Database Models

### Enums
```python
UserRole:          SUPER_ADMIN, OWNER, READER, VOLUNTEER
BookStatus:        AVAILABLE, REQUESTED, REQUEST_ACCEPTED, VOLUNTEER_PICKED,
                   VOLUNTEER_DELIVERED, ISSUED, RETURN_REQUESTED, RETURN_PICKED,
                   RETURN_DELIVERED
AgeGroup:          GENERIC, TODDLER, CHILDREN, TEENAGER, ADULT
WishRequestType:   WANT_TO_READ, WANT_TO_CONTRIBUTE
WishRequestStatus: PENDING, IN_PROGRESS, FULFILLED, REJECTED
BookCondition:     NEW, GOOD, FAIR, WORN
RoleRequestStatus: PENDING, APPROVED, REJECTED
```

### User
```
id, full_name, email (unique), phone, address_line, city, state, pincode,
latitude, longitude, hashed_password, reset_token, reset_token_expires,
role (active role), last_active_role, heard_from,
is_active, is_approved, created_at, updated_at
```
- Multi-role: approved roles stored in `UserRoleAssignment` (many-to-many)
- `role` field = currently active role for the session

### Library
```
id, name, description, address, city, state, pincode, latitude, longitude,
contact_email, contact_phone, owner_id (FK→User), is_active, created_at, updated_at
```

### Book
```
id, title, author, genre, language, age_group, description,
front_image (filename), back_image (filename),
status (BookStatus), library_id (FK→Library), created_at, updated_at
```

### BookRequest
```
id, book_id (FK→Book), reader_id (FK→User), volunteer_id (FK→User),
delivery_address, delivery_notes, status (BookStatus),
requested_at, accepted_at, picked_at, delivered_at, issued_at,
return_requested_at, return_picked_at, return_delivered_at, closed_at, updated_at
```
- When `status = AVAILABLE` → request is closed (book returned). Row stays for audit.
- When cancelled → row is deleted.

### WishRequest
```
id, type (WishRequestType), requester_id (FK→User),
title, author, language, notes,
age_group (WANT_TO_READ only), condition (WANT_TO_CONTRIBUTE only),
quantity (WANT_TO_CONTRIBUTE only), front_image, back_image,
target_library_id (FK→Library, optional),
status (WishRequestStatus), admin_note,
reviewed_by_id (FK→User), reviewed_at, book_id (FK→Book, set on accept),
created_at, updated_at
```

### PointTransaction (Gamification)
```
id, user_id (FK→User), points, reason (string key), description, created_at
```

### UserRoleAssignment
```
id, user_id (FK→User), role (UserRole), granted_at, granted_by_id (FK→User)
UNIQUE(user_id, role)
```

### RoleRequest
```
id, user_id (FK→User), role (UserRole), status (RoleRequestStatus),
requested_at, reviewed_at, reviewed_by_id (FK→User), rejection_note
```

---

## 5. API Reference

All routes prefixed with `/api/v1`. Auth uses `Bearer` JWT in `Authorization` header.

### Auth (`/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register new user (multi-role) |
| POST | `/auth/login` | None | Login → returns JWT + user |
| GET | `/auth/me` | Any | Get current user profile |
| PUT | `/auth/me` | Any | Update own profile |
| POST | `/auth/switch-role` | Any | Switch active role |
| POST | `/auth/forgot-password` | None | Send reset email |
| POST | `/auth/reset-password` | None | Reset password with token |

### Libraries (`/libraries`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/libraries` | Any | List all libraries (paginated, filterable) |
| GET | `/libraries/mine` | OWNER/SUPER_ADMIN | Get my libraries |
| GET | `/libraries/{id}` | Any | Get library detail |
| POST | `/libraries` | OWNER/SUPER_ADMIN | Create library |
| PUT | `/libraries/{id}` | OWNER/SUPER_ADMIN | Update library |
| DELETE | `/libraries/{id}` | OWNER/SUPER_ADMIN | Delete library |

### Books (`/books`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/books` | Any | List books (search, genre, language, age_group, library_id, page) |
| GET | `/books/{id}` | Any | Get book detail |
| POST | `/books/library/{lib_id}` | OWNER/SUPER_ADMIN | Add book (multipart, with images) |
| PUT | `/books/{id}` | OWNER/SUPER_ADMIN | Update book |
| DELETE | `/books/{id}` | OWNER/SUPER_ADMIN | Delete book |
| POST | `/books/{id}/issue` | OWNER/SUPER_ADMIN | Direct issue to reader |
| GET | `/books/lookup-isbn` | Any | ISBN lookup via Open Library |
| POST | `/books/scan-cover` | Any | AI cover scan |

**Multi-filter params**: `language` and `age_group` accept comma-separated values (e.g. `age_group=TODDLER,CHILDREN`).

### Book Requests (`/requests`) — Borrow workflow
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/requests` | READER | Create borrow request (max 3 active) |
| GET | `/requests` | Any | List requests (role-filtered, paginated) |
| GET | `/requests/my/active-count` | Any | Get active request count + limit |
| GET | `/requests/{id}` | Any | Get single request |
| POST | `/requests/{id}/advance` | Any | Advance status (role-based transitions) |
| POST | `/requests/{id}/direct-return` | OWNER/SUPER_ADMIN | Admin direct return of ISSUED book |
| DELETE | `/requests/{id}` | READER/OWNER/SUPER_ADMIN | Cancel REQUESTED book |

#### Status transition rules
```
READER:    ISSUED → RETURN_REQUESTED
VOLUNTEER: REQUESTED → REQUEST_ACCEPTED → VOLUNTEER_PICKED → VOLUNTEER_DELIVERED
           RETURN_REQUESTED → RETURN_PICKED → RETURN_DELIVERED
OWNER:     REQUESTED → ISSUED (direct issue, skip volunteer)
           VOLUNTEER_DELIVERED → ISSUED
           RETURN_REQUESTED → AVAILABLE (direct accept return)
           RETURN_DELIVERED → AVAILABLE
           ISSUED → AVAILABLE (direct-return endpoint, bypasses flow)
SUPER_ADMIN: Same as OWNER on any library
```

#### Book request limit
- Max **3 active** requests per reader at any time
- "Active" = any `BookRequest` where `status != AVAILABLE`
- Enforced in `create_request()` in `request_service.py`
- Constant: `MAX_ACTIVE_REQUESTS = 3`

### Wish Requests / Wishlist (`/wish-requests`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/wish-requests` | Any logged-in | Create wish request (multipart) |
| GET | `/wish-requests/me` | Any logged-in | List own wish requests |
| GET | `/wish-requests` | SUPER_ADMIN | List all wish requests |
| GET | `/wish-requests/{id}` | Own/SUPER_ADMIN | Get wish request detail |
| PUT | `/wish-requests/{id}` | Own, PENDING only | Edit wish request |
| POST | `/wish-requests/{id}/accept` | SUPER_ADMIN | Accept → creates book in catalogue |
| POST | `/wish-requests/{id}/reject` | SUPER_ADMIN | Reject with optional note |

**Multi-filter**: `type` and `status` params accept comma-separated values.

### Users (`/users`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users` | OWNER/SUPER_ADMIN | Search readers by name/email |
| GET | `/users/all` | SUPER_ADMIN | List all approved users |
| GET | `/users/pending` | SUPER_ADMIN | List pending users |
| PATCH | `/users/{id}` | SUPER_ADMIN | Update user basic info (incl. heard_from) |
| POST | `/users/{id}/approve` | SUPER_ADMIN | Approve user + all pending role requests |
| POST | `/users/{id}/reject` | SUPER_ADMIN | Reject/delete pending user |
| GET | `/users/role-requests/pending` | SUPER_ADMIN | List pending role requests |
| POST | `/users/role-requests/{id}/approve` | SUPER_ADMIN | Approve role request |
| POST | `/users/role-requests/{id}/reject` | SUPER_ADMIN | Reject role request |
| GET | `/users/me/roles` | Any | Get own approved roles + pending requests |
| POST | `/users/me/role-requests` | Any | Request additional roles |

### Dashboard (`/dashboard`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | Any logged-in | Stats: libraries, books, requests, users, charts |

### Gamification (`/gamification`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/gamification/me` | Any | Own score, level, recent transactions |

### Admin / Issue Register (`/admin`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/issue-register` | SUPER_ADMIN/READER | Issued books register |
| POST | `/admin/issue-register/{id}/remind` | SUPER_ADMIN | Send overdue reminder email |

### Public (`/public`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/public/books` | None | Public book catalogue |
| GET | `/public/books/{id}/share` | None | Book share page (WhatsApp/Facebook) |

### Static files
- `/uploads/{filename}` → served from `UPLOAD_DIR` on disk

---

## 6. Authentication & Multi-Role System

### JWT Payload
```json
{
  "sub": "user_id",
  "active_role": "READER",
  "roles": ["READER", "OWNER"],
  "exp": 1234567890
}
```

### Role Priority (highest → lowest)
`SUPER_ADMIN > OWNER > VOLUNTEER > READER`

### Instantly Granted Roles (no admin approval needed)
- `READER` only

### Roles Requiring Admin Approval
- `OWNER`, `VOLUNTEER`

### Multi-role behavior
- User can hold multiple approved roles
- Active role stored in `User.role` (set on login or role switch)
- `UserRoleAssignment` table tracks all approved roles
- `User.last_active_role` persists the last-used role across sessions
- Role switch: `POST /auth/switch-role` → re-issues JWT

---

## 7. Frontend Architecture

### Routes
```
/login                → LoginPage
/register             → RegisterPage (2-step)
/forgot-password      → ForgotPasswordPage
/reset-password       → ResetPasswordPage
/catalogue            → PublicBooksPage (no auth)
/ (authenticated)     → Layout wrapper
  /dashboard          → DashboardPage
  /libraries          → LibrariesPage
  /books              → BooksPage
  /requests           → RequestsPage
  /book-requests      → BookRequestsPage (Wishlist)
  /approvals          → PendingApprovalsPage
  /users              → UserPage
  /my-score           → MyScorePage
  /issue-register     → IssueRegisterPage
```

### Default redirects
- READER → `/books`
- All others → `/dashboard`

### AuthContext (`src/context/AuthContext.js`)
Provides: `user`, `login()`, `logout()`, `register()`, `updateProfile()`, `switchRole()`, `userRoles[]`, `isRole(role)`, `isSuperAdmin`

JWT stored in `localStorage` as `token`. User object stored as `user`.
On 401 → auto redirect to `/login`.

### API Service (`src/services/api.js`)
```javascript
authApi        // register, login, me, updateMe, switchRole, forgotPassword, resetPassword
libraryApi     // list, mine, get, create, update, delete
bookApi        // list, get, create, update, delete, issue, scanCover, lookupIsbn
requestApi     // list, get, create, advance, cancel, activeCount, directReturn
dashboardApi   // stats
wishRequestApi // create, listMine, listAll, get, update, accept, reject
gamificationApi // myScore
adminApi       // issueRegister, sendOverdueReminder, pendingRoleRequests, approveRoleRequest, rejectRoleRequest
userApi        // myRoles, requestRoles
getImageUrl(filename) // → http://host/uploads/filename
```

### Layout (`src/components/Layout.js`)
- Left sidebar (desktop) with collapse support
- Mobile: hamburger + slide-in sidebar + bottom tab bar
- Profile menu (top-right on desktop / bottom-right on mobile): Profile, Wishlist, My Score, Issue Register, Logout
- Role switcher shown in sidebar when user has multiple approved roles

---

## 8. Pages — Key Details

### BooksPage
- Grid of book cards with cover image, title, author, library, status badge
- Filters: search (title/author), genre (dropdown), age group (multi-checkbox), language (multi-checkbox)
- Reader quota badge: `📚 X / 3 active` (green→amber→red)
- **Request** button: disabled when reader has 3 active requests
- **Issue** button (OWNER/SUPER_ADMIN): opens UserSearchPopup to pick a reader
- Book cards: Details, Share (WhatsApp + Facebook), Request/Issue, Edit, Delete
- ISBN lookup when adding books (fetches from Open Library, pre-fills form)
- Book ID format: `{LibraryPrefix}-{id}` (e.g. `BBC-42`)

### RequestsPage
- Table of book borrow requests, role-filtered
- Columns: ID, Book (title+author), Status, Reader, Volunteer, Date, Actions
- Status filter: pill checkboxes (multi-select)
- **History** button → timeline modal showing all status timestamps
- **Advance** button → role-based next action (Volunteer: Accept/Pick/Deliver, Owner: Issue/Mark Available, Reader: Request Return)
- **Direct Return** button (purple, OWNER/SUPER_ADMIN only): appears on ISSUED rows — bypasses return flow, immediately makes book AVAILABLE, stamps `return_delivered_at` + `closed_at`
- **Cancel** button (READER/OWNER/SUPER_ADMIN): only on REQUESTED status — deletes request, restores book to AVAILABLE
- Book request detail popup: shows book image, book details, library source (with Leaflet map route), reader destination
- Route map: Nominatim geocoding + OSRM driving directions overlaid on OpenStreetMap

### BookRequestsPage (Wishlist)
- Hero header: gradient navy banner with title + tagline + action buttons
- Two type buttons in hero: **"📖 Want to Read"** and **"🎁 Want to Contribute"** — open form pre-selected
- Filter bar: Type checkboxes + Status checkboxes (multi-select both)
- Table: ID, Type badge, Book title/author, Status, Requested By (admin only), Date, Actions
- **View**: detail modal with all fields, admin sees Accept/Reject buttons
- **Edit**: own requests only, PENDING status only
- **Accept** (SUPER_ADMIN): form to choose library, genre, age group → creates book in catalogue → marks FULFILLED
- **Reject** (SUPER_ADMIN): with optional admin note → marks REJECTED
- Admin hero tagline: "Every dream, every offer — review and fulfil book wishes across the entire network."

### UserPage (Admin)
- Two tabs: All Users | Role Requests (with pending count badge)
- Users list: card rows with avatar, name, email, city, source (heard_from), roles, date
- **Detail modal**: Contact, Address, Account sections + **Source** (heard_from) row + **Edit** button
- Edit form in modal: name, phone, address fields, heard_from (radio options)
- **Role Requests tab**: Approve / Reject (with optional rejection note)

### RegisterPage (2-step)
- Step 1: Full name, email, phone, password, delivery address
- Step 2: Role selection (multi-checkbox), "How did you hear about us?" (radio options)
  - Options: Search engine, Social media, Word of mouth, Other (text box)
  - Stored as `heard_from` in DB

### MyScorePage (Gamification)
- Shows total points, current level (with emoji), progress bar to next level
- Level definitions and recent point transactions

### IssueRegisterPage
- Issued books register (admin + reader)
- Overdue reminder emails (admin)

---

## 9. CSS Design Tokens (`src/index.css`)

```css
--navy:   #1E4D8C   /* primary brand blue */
--text-2: #3D5280   /* secondary text */
--muted:  #6B7FA8   /* muted/hint text */
--border: #D5E0F0   /* borders */
```

**⚠️ NOT defined (do not use):**
`--primary`, `--charcoal`, `--ink`, `--forest`, `--sienna`, `--parchment`

Use hardcoded hex values if you need colors not in the token list.

Leaflet CSS must be imported in `App.js`:
```javascript
import 'leaflet/dist/leaflet.css';
```

react-leaflet must be **v4** (v5 requires React 19, incompatible):
```
react-leaflet@4.2.1
```

---

## 10. Key Business Rules

### Book Borrow Flow
```
AVAILABLE
  → REQUESTED (reader requests)
    → ISSUED (owner direct issue, skip volunteer)
    → REQUEST_ACCEPTED → VOLUNTEER_PICKED → VOLUNTEER_DELIVERED → ISSUED
        → RETURN_REQUESTED (reader initiates return)
          → AVAILABLE (owner direct accept)
          → RETURN_PICKED → RETURN_DELIVERED → AVAILABLE (volunteer return flow)
        → AVAILABLE (admin direct return, bypasses normal return flow)
```

### Reader Book Limit
- Max **3 active** borrow requests at any time
- Active = any BookRequest where `status != AVAILABLE`
- Enforced at backend (`request_service.py: _count_active_requests`)
- Frontend shows quota badge and disables Request button when at limit
- Existing readers with >3 are grandfathered (not retroactively enforced)

### Book Request Lifecycle (closed states)
- **Cancelled**: BookRequest row deleted, book → AVAILABLE
- **Fully returned**: BookRequest row stays, `status = AVAILABLE`, `closed_at` stamped
- **Direct return by admin**: BookRequest stays, `return_delivered_at` + `closed_at` stamped

### Wishlist (WishRequest) Flow
```
PENDING → IN_PROGRESS → FULFILLED (book added to catalogue)
PENDING → IN_PROGRESS → REJECTED  (with admin note)
```
- Edit allowed only at `PENDING`
- Accept/Reject allowed at `PENDING` or `IN_PROGRESS`
- On Accept: book(s) created in chosen library, `WishRequest.book_id` set

### User Approval Flow
```
Register → is_approved=False, is_active=False (for non-READER roles)
         → is_approved=True, is_active=True (for READER, instant)
Admin approves → UserRoleAssignment created, RoleRequest marked APPROVED
              → gamification bonus: 50 points awarded ("JOIN_BONUS")
```

### Gamification Points
- JOIN_BONUS: +50 (on account approval)
- BOOK_ISSUED: +20 (when book is issued to reader)

---

## 11. Map Integration (Request Detail Popup)

Uses **Leaflet + OpenStreetMap + OSRM** (fully free, no API key needed).

```javascript
// Geocoding (address → lat/lng)
GET https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1
// ⚠️ User-Agent header required: 'BaBookCorner/1.0'

// Routing (driving directions)
GET https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson
// ⚠️ OSRM uses lng,lat order (not lat,lng)
```

Library lat/lng used directly from `library.latitude` / `library.longitude` if available. Reader delivery address is always geocoded.

---

## 12. Image Handling

- Uploaded to `UPLOAD_DIR` on disk (set via env var)
- Served at `/uploads/{filename}`
- Frontend helper: `getImageUrl(filename)` → full URL
- Env var: `REACT_APP_UPLOADS_URL` (default: `http://localhost:8000/uploads`)
- ISBN lookup auto-downloads cover image from Open Library and attaches as `front_image`

---

## 13. Environment Variables

### Backend (`config/settings.py`)
```
DATABASE_URL          PostgreSQL connection string
SECRET_KEY            JWT signing key
ACCESS_TOKEN_EXPIRE_MINUTES
UPLOAD_DIR            Absolute path for image uploads
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
ALLOWED_ORIGINS       Comma-separated CORS origins
```

### Frontend (`.env`)
```
REACT_APP_API_BASE_URL     e.g. http://app.boookcorner.in:1000/api/v1
REACT_APP_SHARE_BASE_URL   e.g. http://app.boookcorner.in
REACT_APP_UPLOADS_URL      e.g. http://app.boookcorner.in:1000/uploads
```

---

## 14. Role-wise Feature Matrix

| Feature | SUPER_ADMIN | OWNER | READER | VOLUNTEER |
|---|:---:|:---:|:---:|:---:|
| Dashboard stats | ✅ | ✅ | ✅ | ✅ |
| View all libraries | ✅ | ✅ | ✅ | ✅ |
| Create/Edit/Delete library | ✅ | Own only | ❌ | ❌ |
| View book catalogue | ✅ | ✅ | ✅ | ✅ |
| Add/Edit/Delete books | ✅ | Own lib | ❌ | ❌ |
| Request book (borrow) | ❌ | ❌ | ✅ (max 3) | ❌ |
| Issue book to reader | ✅ | Own lib | ❌ | ❌ |
| Advance request (volunteer flow) | ✅ | Own lib | ❌ | ✅ |
| Cancel request (REQUESTED only) | ✅ | Own lib | Own only | ❌ |
| Request return | ❌ | ❌ | Own only | ❌ |
| Direct return (ISSUED→AVAILABLE) | ✅ | Own lib | ❌ | ❌ |
| Create wishlist request | ✅ | ✅ | ✅ | ✅ |
| View own wishlist | ✅ | ✅ | ✅ | ✅ |
| View all wishlists | ✅ | ❌ | ❌ | ❌ |
| Accept/Reject wishlist | ✅ | ❌ | ❌ | ❌ |
| View all users | ✅ | ❌ | ❌ | ❌ |
| Edit user details | ✅ | ❌ | ❌ | ❌ |
| Approve/Reject users | ✅ | ❌ | ❌ | ❌ |
| Approve/Reject role requests | ✅ | ❌ | ❌ | ❌ |
| Issue register | ✅ | ❌ | Own only | ❌ |
| Send overdue reminder | ✅ | ❌ | ❌ | ❌ |
| View gamification score | ✅ | ✅ | ✅ | ✅ |

---

## 15. Key Patterns & Conventions

### Backend
- **Schema migrations**: `Base.metadata.create_all()` only creates new tables, does NOT ALTER. For new columns on existing tables: run `ALTER TABLE` manually on PostgreSQL or drop+recreate in dev.
- **Service layer**: All business logic in `services/`. Routers are thin (just parse params → call service → return schema).
- **Auth**: `get_current_user` (any logged-in) vs `require_role(UserRole.X)` (specific role). Both in `routers/dependencies.py`.
- **Pagination**: Standard `PaginatedResponse` schema: `{ total, page, page_size, items[] }`.
- **Multi-value query params**: Use `Optional[str]` with comma-split parsing (see `_parse_enum_list` in `wish_request_router.py` and age_group handling in `book_router.py`).
- **Image uploads**: Use `multipart/form-data` with `UploadFile`. Save with `book_service.save_image()`.

### Frontend
- **API calls**: Always use the typed api helpers from `services/api.js`. Never call axios directly in pages.
- **Error display**: `err.response?.data?.detail` is always a string (interceptor flattens Pydantic arrays).
- **Modals**: Use `<Modal title="..." onClose={fn}>` from `components/common.js`.
- **Status badges**: Use `<StatusBadge status={...} />` from common.js.
- **Role check**: Use `useAuth()` → `{ user, isRole, isSuperAdmin }`.
- **Pagination**: Use `<Pagination page={p} totalPages={n} onPageChange={fn} />` from common.js.
- **Multi-select filters**: State as `useState([])`, send as `array.join(',')` in params, backend splits on comma.

---

## 16. Recently Implemented Features (Changelog)

| Feature | Description |
|---|---|
| Book request detail popup | Clickable request rows open modal with book image, library source (with Leaflet route map), reader destination |
| Free map (Leaflet + OSM + OSRM) | Route map in request detail — no API key, no cost |
| Age group multi-select filter | Books page age filter converted from single dropdown to checkboxes |
| Reader can cancel request | REQUESTED status only; book reverts to AVAILABLE |
| Owner can cancel request | Same as reader but for OWNER of that library's book |
| "How did you hear about us?" | Added to Step 2 of registration; stored as `heard_from` column |
| Source field in Users page | `heard_from` shown in listing cards, detail modal, and editable in edit form |
| Admin PATCH user endpoint | `PATCH /users/{id}` — SUPER_ADMIN can edit any user field including `heard_from` |
| Max 3 books per reader | Enforced at backend + frontend quota badge + disabled Request button |
| Active count endpoint | `GET /requests/my/active-count` → `{ count, limit }` |
| Direct return by admin | `POST /requests/{id}/direct-return` — ISSUED → AVAILABLE instantly for OWNER/SUPER_ADMIN |
| Wishlist page rename | "Book Request" nav item renamed to "Wishlist" |
| Wishlist multi-select filters | Type and Status filters converted from dropdowns to pill checkboxes |
| Wishlist hero header | Rich gradient hero banner with meaningful title, tagline, context chips |
| Wishlist action buttons | Hero chips replaced with "Want to Read" / "Want to Contribute" buttons that pre-select form type |

---

## 17. Known Constraints & Gotchas

1. **react-leaflet must be v4** — v5 requires React 19 which is incompatible with React 18. Install with `--legacy-peer-deps`.
2. **OSRM coordinate order is lng,lat** (not lat,lng like Leaflet).
3. **Nominatim requires User-Agent header** (`'BaBookCorner/1.0'`) or requests get blocked.
4. **`Base.metadata.create_all()` does not ALTER tables** — adding columns to existing tables requires manual SQL.
5. **CSS variables `--primary`, `--charcoal`, `--sienna`, `--parchment` are NOT defined** — use hardcoded hex values.
6. **OWNER can only see/act on books in their own library** — backend enforces this on all owner-accessible endpoints.
7. **BookRequest rows are NOT deleted on return** — status becomes `AVAILABLE`. Only `cancel_request` deletes rows.
8. **Direct issue** (owner bypasses volunteer): still requires a BookRequest row to exist first, then `REQUESTED → ISSUED` transition.
9. **Gamification**: Only `JOIN_BONUS` (+50) and `BOOK_ISSUED` (+20) are currently implemented.
10. **Email service** fires after every status transition and on registration — failures are caught and logged, never surface to the user.
11. **Frontend build must be run** (`npm run build`) + frontend service restarted after every frontend change.
12. **Backend service must be restarted** after every backend change.
