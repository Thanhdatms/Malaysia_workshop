# Runs the backend API only, with auto-reload, for development.
# Frontend should be run separately via `npm run dev` in ../frontend (Vite proxies /api here).
Set-Location $PSScriptRoot
& ".\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
