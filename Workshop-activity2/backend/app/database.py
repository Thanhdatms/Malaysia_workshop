from pathlib import Path

from sqlmodel import SQLModel, Session, create_engine

from .config import DATABASE_URL as _CONFIGURED_DATABASE_URL

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "app.db"

if _CONFIGURED_DATABASE_URL:
    # Production: Postgres (e.g. postgresql+psycopg2://user:pass@db:5432/dbname).
    # Normalize the old "postgres://" scheme some providers still hand out.
    DATABASE_URL = _CONFIGURED_DATABASE_URL
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://"):]
    connect_args = {}
else:
    # Local dev: single-file sqlite db, no server to run.
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
