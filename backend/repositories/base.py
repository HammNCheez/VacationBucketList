from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import Any

from models.db import Person, Settings, Trip


class ITripRepository(ABC):
    @abstractmethod
    def list(
        self,
        *,
        statuses: list[str],
        priorities: list[str],
        trip_types: list[str],
        distance_min: float | None,
        distance_max: float | None,
        search: str | None,
        target_date_start: date | None,
        target_date_end: date | None,
    ) -> list[Trip]:
        raise NotImplementedError

    @abstractmethod
    def get(self, trip_id: int) -> Trip | None:
        raise NotImplementedError

    @abstractmethod
    def create(self, payload: dict[str, Any]) -> Trip:
        raise NotImplementedError

    @abstractmethod
    def update(self, trip_id: int, payload: dict[str, Any]) -> Trip | None:
        raise NotImplementedError

    @abstractmethod
    def delete(self, trip_id: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def autocomplete_values(self, field: str) -> list[str]:
        raise NotImplementedError

    @abstractmethod
    def all(self) -> list[Trip]:
        raise NotImplementedError


class IPeopleRepository(ABC):
    @abstractmethod
    def list(self) -> list[Person]:
        raise NotImplementedError

    @abstractmethod
    def create(self, name: str) -> Person:
        raise NotImplementedError

    @abstractmethod
    def delete(self, person_id: int) -> bool:
        raise NotImplementedError


class ISettingsRepository(ABC):
    @abstractmethod
    def get(self) -> Settings | None:
        raise NotImplementedError

    @abstractmethod
    def update(self, home_city: str | None, home_zip: str | None) -> Settings:
        raise NotImplementedError
