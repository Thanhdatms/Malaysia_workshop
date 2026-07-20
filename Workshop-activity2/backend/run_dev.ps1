# Dev launcher: hot-reload backend on :8000
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

& ".\venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
