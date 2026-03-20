from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from models.schemas import SettingsRead, SettingsUpdate
from repositories.settings_repo import SettingsRepository

router = APIRouter()


def get_settings_repository(db: Session = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


@router.get("")
def get_settings(
    repository: Annotated[SettingsRepository, Depends(get_settings_repository)],
) -> SettingsRead:
    settings = repository.get()
    if not settings:
        return SettingsRead()
    return SettingsRead.model_validate(settings)


@router.put("")
def update_settings(
    payload: SettingsUpdate,
    repository: Annotated[SettingsRepository, Depends(get_settings_repository)],
) -> SettingsRead:
    settings = repository.update(payload.home_city, payload.home_zip, payload.ors_api_key)
    return SettingsRead.model_validate(settings)
