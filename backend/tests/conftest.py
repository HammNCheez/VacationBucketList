from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from database.connection import get_db
from main import create_app
from models.db import Base
from routers.trips import get_distance_service
from services.distance import DistanceUnavailableError


class FakeDistanceService:
    def __init__(self) -> None:
        self.should_fail = False
        self.calls = 0

    def calculate(self, origin_text: str, destination_text: str):
        self.calls += 1
        if self.should_fail:
            raise DistanceUnavailableError("forced failure")

        class Result:
            distance_miles = 100.0
            origin_lat = 40.0
            origin_lng = -74.0
            location_lat = 35.0
            location_lng = -80.0

        return Result()


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def fake_distance_service() -> FakeDistanceService:
    return FakeDistanceService()


@pytest.fixture()
def client(
    db_session: Session, fake_distance_service: FakeDistanceService
) -> Generator[TestClient, None, None]:
    app = create_app()

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_distance_service] = lambda: fake_distance_service

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
