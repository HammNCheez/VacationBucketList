from datetime import datetime, timezone
from typing import Annotated
import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi import status as http_status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from database.connection import get_db
from models.schemas import ExportResponse, PersonRead, RestoreResponse, SettingsRead
from repositories.people_repo import PeopleRepository
from repositories.settings_repo import SettingsRepository
from repositories.trip_repo import TripRepository
from routers.trips import trip_to_response
from services.restore import RestoreValidationError, parse_restore_payload, restore_database

SCHEMA_VERSION = "1.0"

router = APIRouter()
RestoreFile = Annotated[UploadFile, File(...)]
DbSession = Annotated[Session, Depends(get_db)]


def get_trip_repository(db: Session = Depends(get_db)) -> TripRepository:
    return TripRepository(db)


def get_people_repository(db: Session = Depends(get_db)) -> PeopleRepository:
    return PeopleRepository(db)


def get_settings_repository(db: Session = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


@router.get("")
def export_data(
    trip_repository: Annotated[TripRepository, Depends(get_trip_repository)],
    people_repository: Annotated[PeopleRepository, Depends(get_people_repository)],
    settings_repository: Annotated[SettingsRepository, Depends(get_settings_repository)],
) -> ExportResponse:
    settings = settings_repository.get()
    return ExportResponse(
        schema_version=SCHEMA_VERSION,
        exported_at=datetime.now(timezone.utc),
        trips=[trip_to_response(trip) for trip in trip_repository.all()],
        people=[PersonRead.model_validate(person) for person in people_repository.list()],
        settings=SettingsRead.model_validate(settings) if settings else SettingsRead(),
    )


@router.post("/restore")
async def restore_data(
    file: RestoreFile,
    db: DbSession,
) -> RestoreResponse:
    try:
        raw_payload = await file.read()
        parsed_json = json.loads(raw_payload)
    except UnicodeDecodeError as error:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Restore file must be UTF-8 JSON",
        ) from error
    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Restore file is not valid JSON",
        ) from error

    try:
        restore_payload = parse_restore_payload(parsed_json)
    except RestoreValidationError as error:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
    except ValidationError as error:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error.errors(),
        ) from error

    return restore_database(db, restore_payload)
