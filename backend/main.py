import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config.settings import get_settings
from config.database import engine, Base
from routers import auth_router, library_router, book_router, request_router, dashboard_router, user_router, public_router
from starlette.middleware.cors import CORSMiddleware


# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Ba Boook Corner API...")
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info("Database tables ensured. Upload dir ready.")
    yield
    logger.info("Shutting down Ba Boook Corner API.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Ba Boook Corner API",
    description="Library Management System for Ba Foundation — promoting book reading.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
#app.add_middleware(
#    CORSMiddleware,
#    allow_origins=settings.origins_list,
#    allow_credentials=True,
#    allow_methods=["*"],
#    allow_headers=["*"],
#)
# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:7000",
        "http://localhost:1000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:7000",
        "http://127.0.0.1:1000",
        "http://43.249.231.181",
        "http://43.249.231.181:7000",
        "http://43.249.231.181:1000",
        "http://app.boookcorner.in",
        "http://app.boookcorner.in:7000",
        "http://app.boookcorner.in:1000",
        "https://app.boookcorner.in",
        "https://app.boookcorner.in:7000",
        "https://app.boookcorner.in:1000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(library_router, prefix=API_PREFIX)
app.include_router(book_router, prefix=API_PREFIX)
app.include_router(request_router, prefix=API_PREFIX)
app.include_router(dashboard_router, prefix=API_PREFIX)
app.include_router(user_router, prefix=API_PREFIX)
app.include_router(public_router, prefix=API_PREFIX)

# ── Static file serving for uploaded images ───────────────────────────────────
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "Ba Boook Corner API"}


# ── Serve React build (production) ───────────────────────────────────────────
FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")

if os.path.exists(FRONTEND_BUILD):
    from fastapi.responses import FileResponse as _FileResponse

    app.mount(
        "/static",
        StaticFiles(directory=os.path.join(FRONTEND_BUILD, "static")),
        name="react-static",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_react_app(full_path: str):
        index_path = os.path.join(FRONTEND_BUILD, "index.html")
        return _FileResponse(index_path)