import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

DEFAULT_SQLITE_URL = "sqlite:///./vacation_bucket_list.db"


def get_database_url() -> str:
    """Build the SQLAlchemy database URL from environment variables.

    Priority:
    1. DATABASE_URL – use as-is (allows full connection string override).
    2. DB_TYPE=mysql  – build mysql+pymysql:// URL from structured vars.
    3. Default        – sqlite local file.
    """
    raw_url = os.getenv("DATABASE_URL")
    if raw_url:
        return raw_url

    db_type = os.getenv("DB_TYPE", "sqlite").lower()
    if db_type == "mysql":
        user = os.getenv("DB_USER", "")
        password = os.getenv("DB_PASSWORD", "")
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "3306")
        name = os.getenv("DB_NAME", "vacation_bucket_list")
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"

    return DEFAULT_SQLITE_URL


DATABASE_URL = get_database_url()


def _engine_connect_args(database_url: str) -> dict[str, bool]:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}

engine = create_engine(DATABASE_URL, connect_args=_engine_connect_args(DATABASE_URL))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
