from typing import Annotated
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from models.schemas import SettingsRead, SettingsResolvedRead, SettingsUpdate
from repositories.settings_repo import SettingsRepository
from services.distance import DistanceService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_settings_repository(db: Session = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


def get_distance_service(
    repository: Annotated[SettingsRepository, Depends(get_settings_repository)],
) -> DistanceService:
    return DistanceService(repository)


def _to_resolved_settings(
    settings: SettingsRead,
    distance_service: DistanceService,
) -> SettingsResolvedRead:
    source = distance_service.api_key_source
    return SettingsResolvedRead(
        home_city=settings.home_city,
        home_zip=settings.home_zip,
        ors_api_key=settings.ors_api_key,
        ors_api_key_source=source,
        ors_api_key_from_environment=(source == "environment"),
    )


@router.get("")
def get_settings(
    repository: Annotated[SettingsRepository, Depends(get_settings_repository)],
    distance_service: Annotated[DistanceService, Depends(get_distance_service)],
) -> SettingsResolvedRead:
    settings = repository.get()
    source = distance_service.api_key_source
    if not settings:
        logger.info("settings_get_empty ors_api_key_source=%s", source)
        return _to_resolved_settings(SettingsRead(), distance_service)
    logger.info("settings_get_success ors_api_key_source=%s", source)
    return _to_resolved_settings(SettingsRead.model_validate(settings), distance_service)


@router.put("")
def update_settings(
    payload: SettingsUpdate,
    repository: Annotated[SettingsRepository, Depends(get_settings_repository)],
    distance_service: Annotated[DistanceService, Depends(get_distance_service)],
) -> SettingsResolvedRead:
    logger.debug(
        "settings_update_start has_home_city=%s has_home_zip=%s has_ors_api_key=%s",
        bool(payload.home_city),
        bool(payload.home_zip),
        bool(payload.ors_api_key),
    )
    settings = repository.update(payload.home_city, payload.home_zip, payload.ors_api_key)
    source = distance_service.api_key_source
    logger.info("settings_update_success ors_api_key_source=%s", source)
    return _to_resolved_settings(SettingsRead.model_validate(settings), distance_service)
