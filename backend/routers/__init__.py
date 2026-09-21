from .auth_router import router as auth_router
from .library_router import router as library_router
from .book_router import router as book_router
from .request_router import router as request_router
from .dashboard_router import router as dashboard_router
from .user_router import router as user_router
from .public_router import router as public_router
from .wish_request_router import router as wish_request_router
from .gamification_router import router as gamification_router
from .issue_register_router import router as issue_register_router

__all__ = ["auth_router", "library_router", "book_router", "request_router", "dashboard_router", "user_router", "public_router", "wish_request_router", "gamification_router", "issue_register_router"]