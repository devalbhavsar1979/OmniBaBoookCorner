"""
Production: serve the React build from FastAPI.
Add this to main.py for single-server deployment.
Run AFTER: npm run build in the frontend directory.
"""
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Add this block to main.py after all API routes:

FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")

if os.path.exists(FRONTEND_BUILD):
    # Serve static assets
    app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_BUILD, "static")), name="static-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        index = os.path.join(FRONTEND_BUILD, "index.html")
        return FileResponse(index)
