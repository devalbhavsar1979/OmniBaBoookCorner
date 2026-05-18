-- ============================================================
-- Ba Boook Corner — PostgreSQL Schema
-- Run this to set up the database from scratch
-- ============================================================

-- Create database (run as postgres superuser)
-- CREATE DATABASE baboook_db;
-- CREATE USER baboook_user WITH PASSWORD 'yourpassword';
-- GRANT ALL PRIVILEGES ON DATABASE baboook_db TO baboook_user;

-- ── ENUMS ────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('OWNER', 'READER', 'VOLUNTEER');

CREATE TYPE book_status AS ENUM (
    'AVAILABLE',
    'REQUESTED',
    'REQUEST_ACCEPTED',
    'VOLUNTEER_PICKED',
    'VOLUNTEER_DELIVERED',
    'ISSUED',
    'RETURN_REQUESTED',
    'RETURN_PICKED',
    'RETURN_DELIVERED'
);

-- ── USERS ────────────────────────────────────────────────────

CREATE TABLE users (
    id               SERIAL PRIMARY KEY,
    full_name        VARCHAR(200)        NOT NULL,
    email            VARCHAR(255) UNIQUE NOT NULL,
    phone            VARCHAR(20),
    hashed_password  VARCHAR(255)        NOT NULL,
    role             user_role           NOT NULL,
    is_active        BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_role     ON users(role);

-- ── LIBRARIES ────────────────────────────────────────────────

CREATE TABLE libraries (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(300) NOT NULL,
    description     TEXT,
    address         TEXT         NOT NULL,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    pincode         VARCHAR(20),
    latitude        FLOAT,
    longitude       FLOAT,
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(20),
    owner_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_library_city    ON libraries(city);
CREATE INDEX idx_library_owner   ON libraries(owner_id);
CREATE INDEX idx_library_active  ON libraries(is_active);

-- ── BOOKS ────────────────────────────────────────────────────

CREATE TABLE books (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(500) NOT NULL,
    author       VARCHAR(300) NOT NULL,
    genre        VARCHAR(100) NOT NULL,
    language     VARCHAR(100) NOT NULL,
    description  TEXT,
    front_image  VARCHAR(500),
    back_image   VARCHAR(500),
    status       book_status  NOT NULL DEFAULT 'AVAILABLE',
    library_id   INTEGER      NOT NULL REFERENCES libraries(id) ON DELETE RESTRICT,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_book_library   ON books(library_id);
CREATE INDEX idx_book_status    ON books(status);
CREATE INDEX idx_book_genre     ON books(genre);
CREATE INDEX idx_book_language  ON books(language);
CREATE INDEX idx_book_title     ON books USING GIN (to_tsvector('english', title));
CREATE INDEX idx_book_author    ON books(author);

-- ── BOOK REQUESTS ────────────────────────────────────────────

CREATE TABLE book_requests (
    id                   SERIAL PRIMARY KEY,
    book_id              INTEGER     NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    reader_id            INTEGER     NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    volunteer_id         INTEGER              REFERENCES users(id) ON DELETE SET NULL,
    delivery_address     TEXT        NOT NULL,
    delivery_notes       TEXT,
    status               book_status NOT NULL DEFAULT 'REQUESTED',
    requested_at         TIMESTAMP   NOT NULL DEFAULT NOW(),
    accepted_at          TIMESTAMP,
    picked_at            TIMESTAMP,
    delivered_at         TIMESTAMP,
    issued_at            TIMESTAMP,
    return_requested_at  TIMESTAMP,
    return_picked_at     TIMESTAMP,
    return_delivered_at  TIMESTAMP,
    closed_at            TIMESTAMP,
    updated_at           TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_request_reader     ON book_requests(reader_id);
CREATE INDEX idx_request_volunteer  ON book_requests(volunteer_id);
CREATE INDEX idx_request_book       ON book_requests(book_id);
CREATE INDEX idx_request_status     ON book_requests(status);

-- ── AUTO-UPDATE updated_at ───────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_libraries_updated_at
    BEFORE UPDATE ON libraries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_book_requests_updated_at
    BEFORE UPDATE ON book_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
