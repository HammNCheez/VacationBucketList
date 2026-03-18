from __future__ import annotations

from pathlib import Path

from sqlalchemy import inspect

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from database.connection import engine, get_database_url

APP_TABLES = {"trips", "cost_items", "people", "comments", "settings", "trip_people"}
BASELINE_REVISION = "0001_baseline_schema"


def _build_alembic_config() -> Config:
    backend_dir = Path(__file__).resolve().parent.parent
    alembic_ini_path = backend_dir / "alembic.ini"
    script_location = backend_dir / "alembic"

    config = Config(str(alembic_ini_path))
    config.set_main_option("script_location", str(script_location))
    config.set_main_option("sqlalchemy.url", get_database_url())
    return config


def _is_legacy_database() -> bool:
    with engine.connect() as connection:
        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())

        has_app_tables = bool(table_names.intersection(APP_TABLES))
        if not has_app_tables:
            return False

        current_revision = MigrationContext.configure(connection).get_current_revision()
        return current_revision is None


def run_migrations() -> None:
    config = _build_alembic_config()

    if _is_legacy_database():
        command.stamp(config, BASELINE_REVISION)

    command.upgrade(config, "head")
