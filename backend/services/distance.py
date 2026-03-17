from dataclasses import dataclass

import httpx

from repositories.settings_repo import SettingsRepository


class DistanceUnavailableError(Exception):
    pass


@dataclass
class DistanceResult:
    distance_miles: float
    origin_lat: float
    origin_lng: float
    location_lat: float
    location_lng: float


class DistanceService:
    def __init__(self, settings_repository: SettingsRepository) -> None:
        self.settings_repository = settings_repository

    @property
    def api_key(self) -> str | None:
        settings = self.settings_repository.get()
        if not settings:
            return None
        return settings.ors_api_key

    def _require_key(self) -> None:
        if not self.api_key:
            raise DistanceUnavailableError("Missing ORS API key")

    def _geocode(self, text: str) -> tuple[float, float]:
        self._require_key()
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                "https://api.openrouteservice.org/geocode/search",
                params={"api_key": self.api_key, "text": text, "size": 1},
            )
            response.raise_for_status()
            data = response.json()
            features = data.get("features", [])
            if not features:
                raise DistanceUnavailableError(f"No geocode match for '{text}'")
            lng, lat = features[0]["geometry"]["coordinates"]
            return float(lat), float(lng)

    def _driving_distance_miles(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> float:
        self._require_key()
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                "https://api.openrouteservice.org/v2/directions/driving-car",
                headers={"Authorization": self.api_key, "Content-Type": "application/json"},
                json={
                    "coordinates": [
                        [origin[1], origin[0]],
                        [destination[1], destination[0]],
                    ]
                },
            )
            response.raise_for_status()
            data = response.json()
            meters = data["routes"][0]["summary"]["distance"]
            return float(meters) * 0.000621371

    def calculate(self, origin_text: str, destination_text: str) -> DistanceResult:
        try:
            origin = self._geocode(origin_text)
            destination = self._geocode(destination_text)
            distance_miles = self._driving_distance_miles(origin, destination)
            return DistanceResult(
                distance_miles=distance_miles,
                origin_lat=origin[0],
                origin_lng=origin[1],
                location_lat=destination[0],
                location_lng=destination[1],
            )
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as error:
            raise DistanceUnavailableError(str(error)) from error
