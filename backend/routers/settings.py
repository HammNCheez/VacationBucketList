from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from models.schemas import SettingsRead, SettingsUpdate
from repositories.settings_repo import SettingsRepository

router = APIRouter()


def get_settings_repository(db: Session = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


@router.get("", response_model=SettingsRead)
def get_settings(repository: SettingsRepository = Depends(get_settings_repository)) -> SettingsRead:
    settings = repository.get()
    if not settings:
        return SettingsRead()
    return SettingsRead.model_validate(settings)


@router.put("", response_model=SettingsRead)
def update_settings(
    payload: SettingsUpdate, repository: SettingsRepository = Depends(get_settings_repository)
) -> SettingsRead:
    settings = repository.update(payload.home_city, payload.home_zip)
    return SettingsRead.model_validate(settings)
