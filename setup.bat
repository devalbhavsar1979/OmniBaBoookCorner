@echo off
REM ============================================================
REM Ba Boook Corner — Windows VM Deployment Script
REM Run this once after cloning the repo
REM ============================================================

echo.
echo === Ba Boook Corner Setup ===
echo.

REM ── 1. Backend setup ────────────────────────────────────────
cd backend

IF NOT EXIST ".env" (
    copy .env.example .env
    echo [!] .env created — EDIT IT before running the app!
    echo     Set DATABASE_URL and SECRET_KEY
    pause
)

echo [+] Installing Python dependencies...
pip install -r requirements.txt

IF NOT EXIST "uploads" mkdir uploads

echo [+] Backend ready.
cd ..

REM ── 2. Frontend setup ───────────────────────────────────────
cd frontend

IF NOT EXIST ".env" (
    copy .env.example .env
)

echo [+] Installing Node dependencies...
npm install

echo [+] Building React app...
npm run build

echo [+] Frontend built.
cd ..

echo.
echo === Setup complete! ===
echo.
echo To start the app, run:  start.bat
echo.
pause
