@echo off
rem RAG chatbot launcher: starts backend and frontend in separate windows
cd /d "%~dp0"
start "rag-backend (close to stop)" cmd /k "cd backend && npm run dev"
start "rag-frontend (close to stop)" cmd /k "cd frontend && npm run dev"
