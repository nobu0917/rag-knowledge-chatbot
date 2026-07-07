@echo off
rem RAG chatbot launcher: start backend + frontend, wait until ready, then open the app URL
cd /d "%~dp0"

echo Starting backend and frontend...
start "rag-backend (close this window to stop)" cmd /k "cd backend && npm run dev"
start "rag-frontend (close this window to stop)" cmd /k "cd frontend && npm run dev"

echo Waiting for servers to be ready (first launch may take a while)...

:wait_backend
timeout /t 1 /nobreak >nul
curl -s -o nul http://localhost:3100/api/health
if errorlevel 1 goto wait_backend

:wait_frontend
timeout /t 1 /nobreak >nul
curl -s -o nul http://localhost:5188
if errorlevel 1 goto wait_frontend

echo Ready. Opening http://localhost:5188 in your browser...
start "" http://localhost:5188

echo.
echo You can close THIS window.
echo To stop the app, close the two black windows (backend / frontend).
timeout /t 5 /nobreak >nul
