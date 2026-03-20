from sqlalchemy.orm import Session

from models.db import Settings
from repositories.base import ISettingsRepository


class SettingsRepository(ISettingsRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self) -> Settings | None:
        return self.db.query(Settings).filter(Settings.id == 1).first()

    def update(
        self, home_city: str | None, home_zip: str | None, ors_api_key: str | None
    ) -> Settings:
        settings = self.get()
        if settings is None:
            # Settings is a singleton row; id=1 is the single allowed record.
            settings = Settings(id=1)
            self.db.add(settings)

        settings.home_city = home_city
        settings.home_zip = home_zip
        settings.ors_api_key = ors_api_key
        self.db.commit()
        self.db.refresh(settings)
        return settings
