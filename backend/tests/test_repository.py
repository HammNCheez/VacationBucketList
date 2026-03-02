from datetime import date

from repositories.base import ITripRepository


class InMemoryTripRepository(ITripRepository):
    def __init__(self) -> None:
        self._data = []
        self._next_id = 1

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
    ):
        return self._data

    def get(self, trip_id: int):
        return next((trip for trip in self._data if trip["id"] == trip_id), None)

    def create(self, payload: dict):
        item = {"id": self._next_id, **payload}
        self._next_id += 1
        self._data.append(item)
        return item

    def update(self, trip_id: int, payload: dict):
        trip = self.get(trip_id)
        if not trip:
            return None
        trip.update(payload)
        return trip

    def delete(self, trip_id: int) -> bool:
        trip = self.get(trip_id)
        if not trip:
            return False
        self._data = [item for item in self._data if item["id"] != trip_id]
        return True

    def autocomplete_values(self, field: str):
        return []

    def all(self):
        return self._data


def test_in_memory_repository_contract() -> None:
    repository = InMemoryTripRepository()
    created = repository.create({"title": "Stub Trip"})
    assert created["id"] == 1
    assert repository.get(1)["title"] == "Stub Trip"

    updated = repository.update(1, {"title": "Updated Stub Trip"})
    assert updated["title"] == "Updated Stub Trip"

    assert repository.delete(1) is True
    assert repository.get(1) is None
