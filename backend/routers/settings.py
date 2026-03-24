from typing import Annotated
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from models.schemas import SettingsRead, SettingsUpdate
from repositories.settings_repo import SettingsRepository

router = APIRouter()
logger = logging.getLogger(__name__)


def get_settings_repository(db: Session = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


@router.get("")
def get_settings(
    repository: Annotated[SettingsRepository, Depends(get_settings_repository)],
) -> SettingsRead:
    settings = repository.get()
    if not settings:
        logger.info("settings_get_empty")
        return SettingsRead()
    logger.info("settings_get_success")
    return SettingsRead.model_validate(settings)


@router.put("")
def update_settings(
    payload: SettingsUpdate,
    repository: Annotated[SettingsRepository, Depends(get_settings_repository)],
) -> SettingsRead:
    logger.debug(
        "settings_update_start has_home_city=%s has_home_zip=%s has_ors_api_key=%s",
        bool(payload.home_city),
        bool(payload.home_zip),
        bool(payload.ors_api_key),
    )
    settings = repository.update(payload.home_city, payload.home_zip, payload.ors_api_key)
    logger.info("settings_update_success")
    return SettingsRead.model_validate(settings)
