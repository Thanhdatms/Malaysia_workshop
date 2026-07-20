from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from .database import engine, init_db
from .routers import admin, chat, questions, submissions, teams, templates
from .seed.loader import ensure_upload_files_exist, seed_if_empty

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    ensure_upload_files_exist()
    with Session(engine) as session:
        seed_if_empty(session)
    yield


app = FastAPI(title="Bossard AI Challenge Workshop", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teams.router)
app.include_router(questions.router)
app.include_router(submissions.router)
app.include_router(templates.router)
app.include_router(admin.router)
app.include_router(chat.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
