from datetime import datetime, timezone
import logging
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
logger = logging.getLogger(__name__)
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
    logger.debug("export_start")
    settings = settings_repository.get()
    trips = [trip_to_response(trip) for trip in trip_repository.all()]
    people = [PersonRead.model_validate(person) for person in people_repository.list()]
    logger.info("export_success trips=%s people=%s", len(trips), len(people))
    return ExportResponse(
        schema_version=SCHEMA_VERSION,
        exported_at=datetime.now(timezone.utc),
        trips=trips,
        people=people,
        settings=SettingsRead.model_validate(settings) if settings else SettingsRead(),
    )


@router.post("/restore")
async def restore_data(
    file: RestoreFile,
    db: DbSession,
) -> RestoreResponse:
    logger.debug("restore_start filename=%s", file.filename)
    try:
        raw_payload = await file.read()
        parsed_json = json.loads(raw_payload)
    except UnicodeDecodeError as error:
        logger.error("restore_invalid_encoding filename=%s", file.filename)
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Restore file must be UTF-8 JSON",
        ) from error
    except json.JSONDecodeError as error:
        logger.error("restore_invalid_json filename=%s error=%s", file.filename, str(error))
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Restore file is not valid JSON",
        ) from error

    try:
        restore_payload = parse_restore_payload(parsed_json)
    except RestoreValidationError as error:
        logger.error(
            "restore_validation_failed field=payload_schema message=%s payload=%s",
            str(error),
            parsed_json,
        )
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
    except ValidationError as error:
        logger.error(
            "restore_pydantic_validation_failed field=payload errors=%s",
            error.errors(),
        )
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error.errors(),
        ) from error

    result = restore_database(db, restore_payload)
    logger.info("restore_success")
    return result
