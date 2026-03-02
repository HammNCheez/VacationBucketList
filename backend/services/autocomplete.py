from repositories.base import ITripRepository


class AutocompleteService:
    def __init__(self, trip_repository: ITripRepository) -> None:
        self.trip_repository = trip_repository

    def values(self, field: str) -> list[str]:
        return self.trip_repository.autocomplete_values(field)
