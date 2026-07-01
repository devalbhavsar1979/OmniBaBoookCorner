@echo off
REM ============================================================
REM Ba Boook Corner — Start Application (Windows, development)
REM Backend  → http://localhost:1000
REM Frontend → http://localhost:7000
REM ============================================================

echo Starting Ba Boook Corner...

echo running npn run buil 

cd .\frontend\
rem npm install
npm run build
cd ..


REM Start backend (FastAPI on port 2000)
REM  start "BaBookCorner - Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --host 0.0.0.0 --port 1000 --reload"

REM Start frontend static server (port 7000
REM start "BaBookCorner - Frontend" cmd /k "cd /d %~dp0frontend && node frontend-server.js"

nssm stop BaBookCorner-Backend
nssm stop BaBookCorner-Frontend
nssm start BaBookCorner-Backend
nssm start BaBookCorner-Frontend

echo.
echo Backend  API:  http://localhost:1000/api/v1
echo API Docs:      http://localhost:1000/api/docs
echo Frontend UI:   http://localhost:7000
echo.
echo External access:
echo   http://43.249.231.181:1000/api/docs
echo   http://43.249.231.181:7000
echo.
echo Press any key to exit this window (servers keep running)...
pause
