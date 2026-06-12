"""create enums and ensure book_requests

Revision ID: 0001_create_enums_and_requests
Revises: 
Create Date: 2026-06-11 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_create_enums_and_requests'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Use op.execute with sa.text to run raw SQL
    # Create user_role enum if not exists
    op.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('OWNER','READER','VOLUNTEER');
        END IF;
    END$$;
    """))

    # Create book_status enum if not exists
    op.execute(sa.text("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'book_status') THEN
            CREATE TYPE book_status AS ENUM (
                'AVAILABLE','REQUESTED','REQUEST_ACCEPTED','VOLUNTEER_PICKED','VOLUNTEER_DELIVERED',
                'ISSUED','RETURN_REQUESTED','RETURN_PICKED','RETURN_DELIVERED'
            );
        END IF;
    END$$;
    """))

    # Ensure book_requests table exists (creates only if missing)
    op.execute(sa.text("""
    CREATE TABLE IF NOT EXISTS book_requests (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL,
        reader_id INTEGER NOT NULL,
        volunteer_id INTEGER,
        delivery_address TEXT NOT NULL,
        delivery_notes TEXT,
        status book_status NOT NULL DEFAULT 'REQUESTED',
        requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
        accepted_at TIMESTAMP,
        picked_at TIMESTAMP,
        delivered_at TIMESTAMP,
        issued_at TIMESTAMP,
        return_requested_at TIMESTAMP,
        return_picked_at TIMESTAMP,
        return_delivered_at TIMESTAMP,
        closed_at TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """))


def downgrade():
    # only drop tables/enums intentionally if you know what you're doing
    # Drop the table if present (be careful in production)
    op.execute(sa.text("DROP TABLE IF EXISTS book_requests CASCADE;"))
    # Do not drop enums to avoid accidental data loss
    # keep enums in place to avoid accidental drop; manual cleanup required if necessary