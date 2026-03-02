from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from models.schemas import ExportResponse, PersonRead, SettingsRead
from repositories.people_repo import PeopleRepository
from repositories.settings_repo import SettingsRepository
from repositories.trip_repo import TripRepository
from routers.trips import _trip_to_response

SCHEMA_VERSION = "1.0"

router = APIRouter()


def get_trip_repository(db: Session = Depends(get_db)) -> TripRepository:
    return TripRepository(db)


def get_people_repository(db: Session = Depends(get_db)) -> PeopleRepository:
    return PeopleRepository(db)


def get_settings_repository(db: Session = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


@router.get("", response_model=ExportResponse)
def export_data(
    trip_repository: TripRepository = Depends(get_trip_repository),
    people_repository: PeopleRepository = Depends(get_people_repository),
    settings_repository: SettingsRepository = Depends(get_settings_repository),
) -> ExportResponse:
    settings = settings_repository.get()
    return ExportResponse(
        schema_version=SCHEMA_VERSION,
        exported_at=datetime.now(timezone.utc),
        trips=[_trip_to_response(trip) for trip in trip_repository.all()],
        people=[PersonRead.model_validate(person) for person in people_repository.list()],
        settings=SettingsRead.model_validate(settings) if settings else SettingsRead(),
    )
