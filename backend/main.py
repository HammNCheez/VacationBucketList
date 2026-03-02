from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.schema import init_db
from routers import export, people, settings, trips


def create_app() -> FastAPI:
    app = FastAPI(title="Vacation Bucket List API")

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

    @app.on_event("startup")
    def on_startup() -> None:
        init_db()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
