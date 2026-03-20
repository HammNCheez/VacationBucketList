from database.migrations import run_migrations


def init_db() -> None:
    run_migrations()
