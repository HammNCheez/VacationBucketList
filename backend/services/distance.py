from dataclasses import dataclass
import logging
import os

import httpx

from repositories.settings_repo import SettingsRepository

logger = logging.getLogger(__name__)


class DistanceUnavailableError(Exception):
    pass


@dataclass
class DistanceResult:
    distance_miles: float
    travel_time_hours: float
    origin_lat: float
    origin_lng: float
    location_lat: float
    location_lng: float


class DistanceService:
    def __init__(self, settings_repository: SettingsRepository) -> None:
        self.settings_repository = settings_repository

    @property
    def env_api_key(self) -> str | None:
        api_key = os.getenv("ORS_API_KEY")
        if not api_key:
            return None
        return api_key.strip() or None

    @property
    def db_api_key(self) -> str | None:
        settings = self.settings_repository.get()
        if not settings:
            return None
        return settings.ors_api_key

    @property
    def api_key(self) -> str | None:
        return self.env_api_key or self.db_api_key

    @property
    def api_key_source(self) -> str:
        if self.env_api_key:
            return "environment"
        if self.db_api_key:
            return "database"
        return "none"

    def _require_key(self) -> str:
        api_key = self.api_key
        if not api_key:
            logger.error("distance_missing_api_key field=ors_api_key")
            raise DistanceUnavailableError("Missing ORS API key")
        return api_key

    def _geocode(self, text: str) -> tuple[float, float]:
        logger.debug("distance_geocode_start text=%s", text)
        api_key = self._require_key()
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                "https://api.openrouteservice.org/geocode/search",
                params={"api_key": api_key, "text": text, "size": 1},
            )
            response.raise_for_status()
            data = response.json()
            features = data.get("features", [])
            if not features:
                logger.error("distance_geocode_not_found field=text value=%s", text)
                raise DistanceUnavailableError(f"No geocode match for '{text}'")
            lng, lat = features[0]["geometry"]["coordinates"]
            logger.debug("distance_geocode_success text=%s lat=%s lng=%s", text, lat, lng)
            return float(lat), float(lng)

    def _round_travel_time_hours(self, hours: float) -> float:
        increment = 0.25 if hours < 3 else 0.5
        rounded = round(hours / increment) * increment
        return round(rounded, 2)

    def _driving_metrics(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> tuple[float, float]:
        logger.debug(
            "distance_directions_start origin=%s destination=%s",
            origin,
            destination,
        )
        api_key = self._require_key()
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                "https://api.openrouteservice.org/v2/directions/driving-car",
            headers={"Authorization": api_key, "Content-Type": "application/json"},
                json={
                    "coordinates": [
                        [origin[1], origin[0]],
                        [destination[1], destination[0]],
                    ]
                },
            )
            response.raise_for_status()
            data = response.json()
            summary = data["routes"][0]["summary"]
            distance_miles = float(summary["distance"]) * 0.000621371
            travel_time_hours = self._round_travel_time_hours(float(summary["duration"]) / 3600)
            logger.debug(
                "distance_directions_success distance_miles=%.2f travel_time_hours=%.2f",
                distance_miles,
                travel_time_hours,
            )
            return distance_miles, travel_time_hours

    def calculate(self, origin_text: str, destination_text: str) -> DistanceResult:
        logger.info(
            "distance_calculation_start origin=%s destination=%s",
            origin_text,
            destination_text,
        )
        try:
            origin = self._geocode(origin_text)
            destination = self._geocode(destination_text)
            distance_miles, travel_time_hours = self._driving_metrics(origin, destination)
            logger.info(
                "distance_calculation_success origin=%s destination=%s distance_miles=%.2f",
                origin_text,
                destination_text,
                distance_miles,
            )
            return DistanceResult(
                distance_miles=distance_miles,
                travel_time_hours=travel_time_hours,
                origin_lat=origin[0],
                origin_lng=origin[1],
                location_lat=destination[0],
                location_lng=destination[1],
            )
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as error:
            logger.error(
                "distance_calculation_failed origin=%s destination=%s error=%s",
                origin_text,
                destination_text,
                str(error),
            )
            raise DistanceUnavailableError(str(error)) from error
