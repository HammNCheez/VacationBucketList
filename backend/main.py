from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.schema import init_db
from logging_config import configure_logging
from routers import export, people, settings, trips

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def app_lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("backend_lifespan_start")
    try:
        init_db()
        logger.info("database_initialized")
    except Exception:
        logger.exception("database_init_failed")
        raise
    yield
    logger.info("backend_lifespan_stop")


def create_app() -> FastAPI:
    logger.info("create_app")
    app = FastAPI(title="Vacation Bucket List API", lifespan=app_lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(trips.router, prefix="/trips", tags=["trips"])
    app.include_router(people.router, prefix="/people", tags=["people"])
    app.include_router(settings.router, prefix="/settings", tags=["settings"])
    app.include_router(export.router, prefix="/export", tags=["export"])

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
