# 📚 Ba Boook Corner

**A Library Management System by Ba Foundation — promoting book reading across communities.**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [API Contract](#api-contract)
6. [Role & Permissions](#roles--permissions)
7. [Book Status Flow](#book-status-flow)
8. [Deployment Guide (Windows VM)](#deployment-guide-windows-vm)
9. [Development Setup](#development-setup)
10. [Environment Variables](#environment-variables)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Windows VM                            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │               FastAPI (Port 8000)               │    │
│  │                                                  │    │
│  │  /api/v1/*  ── REST API (JSON)                  │    │
│  │  /uploads/* ── Static images                    │    │
│  │  /*         ── Serves React build               │    │
│  │                                                  │    │
│  │  Layers:                                         │    │
│  │  routers/ → services/ → models/ → PostgreSQL    │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│  ┌───────────────────────▼─────────────────────────┐    │
│  │           PostgreSQL Database                    │    │
│  │   users | libraries | books | book_requests     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │          React PWA (built → served by FastAPI)  │    │
│  │  Pages: Dashboard | Libraries | Books | Requests│    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer      | Technology                             |
|------------|----------------------------------------|
| Backend    | FastAPI 0.111, Python 3.11+            |
| ORM        | SQLAlchemy 2.0                         |
| Validation | Pydantic v2                            |
| Auth       | JWT (python-jose) + bcrypt             |
| Database   | PostgreSQL 14+                         |
| Frontend   | React 18, React Router 6, Axios        |
| Hosting    | Single Windows VM (uvicorn)            |

---

## Project Structure

```
ba-boook-corner/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example             # Copy to .env and fill in
│   ├── alembic.ini
│   ├── config/
│   │   ├── settings.py          # Pydantic settings (reads .env)
│   │   └── database.py          # SQLAlchemy engine + session
│   ├── models/
│   │   └── models.py            # SQLAlchemy ORM models + enums
│   ├── schemas/
│   │   └── schemas.py           # Pydantic request/response schemas
│   ├── services/
│   │   ├── auth_service.py      # JWT, password, user registration
│   │   ├── library_service.py   # Library CRUD
│   │   ├── book_service.py      # Book CRUD + image upload
│   │   ├── request_service.py   # Request lifecycle + status flow
│   │   └── dashboard_service.py # Aggregated stats
│   ├── routers/
│   │   ├── dependencies.py      # get_current_user, require_role
│   │   ├── auth_router.py
│   │   ├── library_router.py
│   │   ├── book_router.py
│   │   ├── request_router.py
│   │   └── dashboard_router.py
│   └── uploads/                 # Stored book images
│
├── frontend/
│   ├── package.json
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json        # PWA manifest
│   └── src/
│       ├── App.js               # Routing
│       ├── index.js
│       ├── index.css            # Design system + global styles
│       ├── context/
│       │   └── AuthContext.js   # Auth state + JWT storage
│       ├── services/
│       │   └── api.js           # Axios client + all API calls
│       ├── components/
│       │   ├── Layout.js        # Sidebar + outlet
│       │   └── common.js        # Reusable: Modal, Badge, Spinner…
│       └── pages/
│           ├── LoginPage.js
│           ├── RegisterPage.js
│           ├── DashboardPage.js
│           ├── LibrariesPage.js
│           ├── BooksPage.js
│           └── RequestsPage.js
│
├── schema.sql                   # Full PostgreSQL DDL
├── setup.bat                    # One-time setup (Windows)
├── start.bat                    # Start the application
└── README.md
```

---

## Database Schema

### Entity Relationships

```
users (1) ──────────── (many) libraries
users (1) ──────────── (many) book_requests [as reader]
users (1) ──────────── (many) book_requests [as volunteer]
libraries (1) ───────── (many) books
books (1) ───────────── (many) book_requests
```

### Tables

**users** — `id, full_name, email, phone, hashed_password, role(OWNER|READER|VOLUNTEER), is_active, created_at, updated_at`

**libraries** — `id, name, description, address, city, state, pincode, latitude, longitude, contact_email, contact_phone, owner_id→users, is_active, created_at, updated_at`

**books** — `id, title, author, genre, language, description, front_image, back_image, status(ENUM), library_id→libraries, created_at, updated_at`

**book_requests** — `id, book_id→books, reader_id→users, volunteer_id→users, delivery_address, delivery_notes, status(ENUM), requested_at, accepted_at, picked_at, delivered_at, issued_at, return_requested_at, return_picked_at, return_delivered_at, closed_at, updated_at`

---

## API Contract

All endpoints are prefixed with `/api/v1`. JWT token required in header: `Authorization: Bearer <token>`

### Authentication

| Method | Endpoint           | Auth | Description              |
|--------|--------------------|------|--------------------------|
| POST   | /auth/register     | No   | Register new user        |
| POST   | /auth/login        | No   | Login, get JWT token     |
| GET    | /auth/me           | Yes  | Get current user profile |

**Register payload:**
```json
{
  "full_name": "Priya Patel",
  "email": "priya@example.com",
  "password": "secret123",
  "phone": "+91 98765 43210",
  "role": "READER"
}
```

**Login response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": 1, "full_name": "Priya Patel", "role": "READER", ... }
}
```

### Libraries

| Method | Endpoint                | Auth  | Role  | Description              |
|--------|-------------------------|-------|-------|--------------------------|
| GET    | /libraries              | Yes   | All   | List libraries (paginated)|
| GET    | /libraries/mine         | Yes   | OWNER | My libraries             |
| GET    | /libraries/{id}         | Yes   | All   | Get library detail       |
| POST   | /libraries              | Yes   | OWNER | Create library           |
| PUT    | /libraries/{id}         | Yes   | OWNER | Update library           |
| DELETE | /libraries/{id}         | Yes   | OWNER | Soft-delete library      |

**Query params:** `?search=&city=&page=1&page_size=20`

### Books

| Method | Endpoint                       | Auth  | Role  | Description       |
|--------|--------------------------------|-------|-------|-------------------|
| GET    | /books                         | Yes   | All   | List/search books |
| GET    | /books/{id}                    | Yes   | All   | Get book detail   |
| POST   | /books/library/{library_id}    | Yes   | OWNER | Add book (multipart)|
| PUT    | /books/{id}                    | Yes   | OWNER | Update book (multipart)|
| DELETE | /books/{id}                    | Yes   | OWNER | Delete book       |

**Query params:** `?search=&genre=&language=&status=&library_id=&page=1&page_size=20`

**Create book (multipart/form-data):**
```
title, author, genre, language, description, front_image (file), back_image (file)
```

### Requests

| Method | Endpoint                  | Auth | Role                 | Description               |
|--------|---------------------------|------|----------------------|---------------------------|
| GET    | /requests                 | Yes  | All (role-filtered)  | List requests             |
| GET    | /requests/{id}            | Yes  | All                  | Get request detail        |
| POST   | /requests                 | Yes  | READER               | Create book request       |
| POST   | /requests/{id}/advance    | Yes  | VOLUNTEER/OWNER/READER| Advance status           |
| DELETE | /requests/{id}            | Yes  | READER               | Cancel request            |

**Create request payload:**
```json
{
  "book_id": 5,
  "delivery_address": "42 MG Road, Ahmedabad 380001",
  "delivery_notes": "Call before delivery"
}
```

### Dashboard

| Method | Endpoint   | Auth | Description       |
|--------|------------|------|-------------------|
| GET    | /dashboard | Yes  | Aggregated stats  |

**Response:**
```json
{
  "total_libraries": 12,
  "total_books": 348,
  "total_requests": 92,
  "total_users": 45,
  "books_by_status": [{"status": "AVAILABLE", "count": 280}, ...],
  "books_by_genre": [{"genre": "Fiction", "count": 120}, ...],
  "books_by_language": [{"language": "Gujarati", "count": 90}, ...],
  "books_by_author": [{"author": "Rabindranath Tagore", "count": 8}, ...]
}
```

---

## Roles & Permissions

| Action                         | OWNER | READER | VOLUNTEER |
|-------------------------------|-------|--------|-----------|
| Create/edit/delete library     | ✅    | ❌     | ❌        |
| Add/edit/delete books          | ✅    | ❌     | ❌        |
| Request a book                 | ❌    | ✅     | ❌        |
| Accept / pick / deliver        | ❌    | ❌     | ✅        |
| Issue book (DELIVERED → ISSUED)| ✅    | ❌     | ❌        |
| Request return                 | ❌    | ✅     | ❌        |
| Mark return available          | ✅    | ❌     | ❌        |
| View dashboard                 | ✅    | ✅     | ✅        |

---

## Book Status Flow

```
AVAILABLE
    │  Reader requests
    ▼
REQUESTED
    │  Volunteer accepts
    ▼
REQUEST_ACCEPTED
    │  Volunteer picks up from library
    ▼
VOLUNTEER_PICKED
    │  Volunteer delivers to reader
    ▼
VOLUNTEER_DELIVERED
    │  Library Owner issues
    ▼
ISSUED
    │  Reader requests return
    ▼
RETURN_REQUESTED
    │  Volunteer picks up from reader
    ▼
RETURN_PICKED
    │  Volunteer delivers back to library
    ▼
RETURN_DELIVERED
    │  Library Owner marks returned
    ▼
AVAILABLE  ← back to start
```

---

## Deployment Guide (Windows VM)

### Prerequisites

Install these on your Windows VM:

1. **Python 3.11+** — https://python.org/downloads
   - During install: check "Add Python to PATH"
2. **Node.js 20 LTS** — https://nodejs.org
3. **PostgreSQL 14+** — https://postgresql.org/download/windows
   - Note the password you set for the `postgres` user
4. **Git** (optional) — https://git-scm.com

---

### Step 1 — Database Setup

Open **pgAdmin** or run **psql** as postgres:

```sql
CREATE DATABASE baboook_db;
CREATE USER baboook_user WITH PASSWORD 'yourStrongPassword';
GRANT ALL PRIVILEGES ON DATABASE baboook_db TO baboook_user;
```

Then run the schema:
```
psql -U baboook_user -d baboook_db -f schema.sql
```

Or copy-paste `schema.sql` contents into pgAdmin's Query Tool.

---

### Step 2 — Configure Environment

Copy and edit backend config:
```
cd backend
copy .env.example .env
notepad .env
```

Set these values in `.env`:
```
DATABASE_URL=postgresql://baboook_user:yourStrongPassword@localhost:5432/baboook_db
SECRET_KEY=generate-a-long-random-string-here-at-least-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=1440
UPLOAD_DIR=uploads
ALLOWED_ORIGINS=http://localhost:8000,http://YOUR_VM_IP:8000
```

To generate a SECRET_KEY, run in Python:
```python
import secrets; print(secrets.token_hex(32))
```

Copy and edit frontend config:
```
cd ..\frontend
copy .env.example .env
notepad .env
```

Set:
```
REACT_APP_API_BASE_URL=http://YOUR_VM_IP:8000/api/v1
REACT_APP_UPLOADS_URL=http://YOUR_VM_IP:8000/uploads
```

---

### Step 3 — Install Dependencies

Run `setup.bat` or manually:

**Backend:**
```cmd
cd backend
pip install -r requirements.txt
```

**Frontend:**
```cmd
cd frontend
npm install
npm run build
```

---

### Step 4 — Start the Application

```cmd
start.bat
```

Or manually:
```cmd
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

Access the app:
- **Application:** http://YOUR_VM_IP:8000
- **API Docs (Swagger):** http://YOUR_VM_IP:8000/api/docs
- **API Docs (ReDoc):** http://YOUR_VM_IP:8000/api/redoc

---

### Step 5 — Windows Firewall

Allow port 8000:
```cmd
netsh advfirewall firewall add rule name="Ba Boook Corner" dir=in action=allow protocol=TCP localport=8000
```

---

### Step 6 — Run as Windows Service (Optional, for production)

Install NSSM (Non-Sucking Service Manager): https://nssm.cc

```cmd
nssm install BaBoookCorner "C:\Python311\Scripts\uvicorn.exe"
nssm set BaBoookCorner AppParameters "main:app --host 0.0.0.0 --port 8000"
nssm set BaBoookCorner AppDirectory "C:\path\to\ba-boook-corner\backend"
nssm start BaBoookCorner
```

---

## Development Setup

For development with hot-reload (frontend + backend separately):

**Terminal 1 — Backend:**
```cmd
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend (dev server):**
```cmd
cd frontend
npm start
```

Frontend runs at http://localhost:3000 and proxies API calls to port 8000.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                    | Required | Default  | Description                    |
|-----------------------------|----------|----------|--------------------------------|
| DATABASE_URL                | ✅       | —        | PostgreSQL connection string   |
| SECRET_KEY                  | ✅       | —        | JWT signing secret (32+ chars) |
| ACCESS_TOKEN_EXPIRE_MINUTES | No       | 1440     | Token lifetime (24h default)   |
| UPLOAD_DIR                  | No       | uploads  | Directory for book images      |
| ALLOWED_ORIGINS             | No       | localhost| Comma-separated CORS origins   |

### Frontend (`frontend/.env`)

| Variable                  | Description                              |
|---------------------------|------------------------------------------|
| REACT_APP_API_BASE_URL    | Backend API URL (e.g. http://IP:8000/api/v1)|
| REACT_APP_UPLOADS_URL     | Backend uploads URL (e.g. http://IP:8000/uploads)|

---

## Supported Image Formats

- `.jpg` / `.jpeg`
- `.png`
- `.gif`

Images are stored in `backend/uploads/` and served at `/uploads/{filename}`.

---

*Built with ❤️ for Ba Foundation — because every book deserves a reader.*
