from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .database import create_db_and_tables
from .routers import admin, analysis, chat, evaluate_steps, process_steps, teams, workflow

app = FastAPI(title="AI Workflow Designer Workshop")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()


app.include_router(teams.router)
app.include_router(process_steps.router)
app.include_router(evaluate_steps.router)
app.include_router(workflow.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(analysis.router)

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
