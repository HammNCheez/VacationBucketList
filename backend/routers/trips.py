import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database.connection import get_db
from models.db import Trip
from models.schemas import (
    TripCreate,
    TripMutationResponse,
    TripRead,
    TripUpdate,
    WarningMessage,
)
from repositories.settings_repo import SettingsRepository
from repositories.trip_repo import TripRepository
from services.distance import DistanceService, DistanceUnavailableError
from services.formatting import normalize_title_case_list, to_title_case

router = APIRouter()

TRIP_NOT_FOUND_MESSAGE = "Trip not found"
DISTANCE_WARNING_MESSAGE = "Distance could not be calculated right now."


def get_trip_repository(db: Session = Depends(get_db)) -> TripRepository:
    return TripRepository(db)


def get_settings_repository(db: Session = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


def get_distance_service() -> DistanceService:
    return DistanceService()


def _trip_types_from_db(value: str) -> list[str]:
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except json.JSONDecodeError:
        pass
    return []


def _format_number(value: float) -> str:
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.2f}".rstrip("0").rstrip(".")


def _build_total_trip_length(duration_days: float, travel_time_hours: float) -> str:
    total_travel_hours = travel_time_hours * 2
    extra_days = int(total_travel_hours // 24)
    remaining_hours = total_travel_hours % 24
    total_days = duration_days + extra_days
    return f"{_format_number(total_days)} days, {_format_number(remaining_hours)} hours"


def _build_per_person_cost(trip: Trip) -> tuple[float | None, str | None]:
    if not trip.people:
        return None, None

    currencies = {item.currency for item in trip.cost_items if item.currency}
    if len(currencies) > 1:
        return None, None

    total = sum(item.amount for item in trip.cost_items)
    per_person = total / len(trip.people)
    currency = next(iter(currencies), None)
    return per_person, currency


def _trip_to_response(trip: Trip, warnings: list[WarningMessage] | None = None) -> TripMutationResponse:
    trip_types = _trip_types_from_db(trip.trip_types)
    per_person_cost, per_person_currency = _build_per_person_cost(trip)

    return TripMutationResponse(
        id=trip.id,
        title=trip.title,
        location=trip.location,
        location_lat=trip.location_lat,
        location_lng=trip.location_lng,
        origin=trip.origin,
        origin_lat=trip.origin_lat,
        origin_lng=trip.origin_lng,
        distance_miles=trip.distance_miles,
        status=trip.status,
        priority=trip.priority,
        trip_types=trip_types,
        travel_time_hours=trip.travel_time_hours,
        duration_days=trip.duration_days,
        total_trip_length=_build_total_trip_length(trip.duration_days, trip.travel_time_hours),
        target_date_start=trip.target_date_start,
        target_date_end=trip.target_date_end,
        target_date_range=trip.target_date_range,
        notes=trip.notes,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
        cost_items=trip.cost_items,
        comments=trip.comments,
        people=trip.people,
        per_person_cost=per_person_cost,
        per_person_currency=per_person_currency,
        warnings=warnings or [],
    )


def _distance_warning() -> WarningMessage:
    return WarningMessage(code="DISTANCE_UNAVAILABLE", message=DISTANCE_WARNING_MESSAGE)


def _normalize_payload(payload: TripCreate | TripUpdate) -> dict:
    values = payload.model_dump(exclude_unset=True)
    if "trip_types" in values and values["trip_types"] is not None:
        values["trip_types"] = normalize_title_case_list(values["trip_types"])
    if "target_date_range" in values and values["target_date_range"]:
        values["target_date_range"] = to_title_case(values["target_date_range"])
    if "cost_items" in values and values["cost_items"] is not None:
        normalized_cost_items = []
        for item in values["cost_items"]:
            item_copy = {**item}
            item_copy["category"] = to_title_case(item_copy["category"])
            normalized_cost_items.append(item_copy)
        values["cost_items"] = normalized_cost_items
    return values


@router.get("", response_model=list[TripRead])
def list_trips(
    status: list[str] = Query(default=[]),
    priority: list[str] = Query(default=[]),
    trip_type: list[str] = Query(default=[]),
    distance_min: float | None = Query(default=None, ge=0),
    distance_max: float | None = Query(default=None, ge=0),
    search: str | None = Query(default=None),
    target_date_start: date | None = Query(default=None),
    target_date_end: date | None = Query(default=None),
    repository: TripRepository = Depends(get_trip_repository),
) -> list[TripRead]:
    if distance_min is not None and distance_max is not None and distance_min > distance_max:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="distance_min must be <= distance_max")

    trips = repository.list(
        statuses=status,
        priorities=priority,
        trip_types=trip_type,
        distance_min=distance_min,
        distance_max=distance_max,
        search=search,
        target_date_start=target_date_start,
        target_date_end=target_date_end,
    )
    return [_trip_to_response(trip) for trip in trips]


@router.get("/autocomplete")
def autocomplete_values(
    field: str, repository: TripRepository = Depends(get_trip_repository)
) -> list[str]:
    allowed = {"trip_type", "target_date_range", "cost_category"}
    if field not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid field")
    return repository.autocomplete_values(field)


@router.get("/{trip_id}", response_model=TripRead)
def get_trip(trip_id: int, repository: TripRepository = Depends(get_trip_repository)) -> TripRead:
    trip = repository.get(trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=TRIP_NOT_FOUND_MESSAGE)
    return _trip_to_response(trip)


@router.post("", response_model=TripMutationResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    payload: TripCreate,
    repository: TripRepository = Depends(get_trip_repository),
    settings_repository: SettingsRepository = Depends(get_settings_repository),
    distance_service: DistanceService = Depends(get_distance_service),
) -> TripMutationResponse:
    values = _normalize_payload(payload)

    settings = settings_repository.get()
    if not values.get("origin"):
        values["origin"] = settings.home_city if settings and settings.home_city else None

    warnings: list[WarningMessage] = []
    if values.get("origin") and values.get("location"):
        try:
            distance = distance_service.calculate(values["origin"], values["location"])
            values["distance_miles"] = distance.distance_miles
            values["origin_lat"] = distance.origin_lat
            values["origin_lng"] = distance.origin_lng
            values["location_lat"] = distance.location_lat
            values["location_lng"] = distance.location_lng
        except DistanceUnavailableError:
            warnings.append(_distance_warning())
            values["distance_miles"] = None
            values["origin_lat"] = None
            values["origin_lng"] = None
            values["location_lat"] = None
            values["location_lng"] = None
    else:
        warnings.append(_distance_warning())

    trip = repository.create(values)
    return _trip_to_response(trip, warnings)


@router.put("/{trip_id}", response_model=TripMutationResponse)
def update_trip(
    trip_id: int,
    payload: TripUpdate,
    repository: TripRepository = Depends(get_trip_repository),
    settings_repository: SettingsRepository = Depends(get_settings_repository),
    distance_service: DistanceService = Depends(get_distance_service),
) -> TripMutationResponse:
    existing = repository.get(trip_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=TRIP_NOT_FOUND_MESSAGE)

    values = _normalize_payload(payload)
    if "origin" in values and not values["origin"]:
        settings = settings_repository.get()
        values["origin"] = settings.home_city if settings and settings.home_city else None

    origin_after = values.get("origin", existing.origin)
    location_after = values.get("location", existing.location)

    should_recalculate = "origin" in values or "location" in values
    warnings: list[WarningMessage] = []

    if should_recalculate:
        if origin_after and location_after:
            try:
                distance = distance_service.calculate(origin_after, location_after)
                values["distance_miles"] = distance.distance_miles
                values["origin_lat"] = distance.origin_lat
                values["origin_lng"] = distance.origin_lng
                values["location_lat"] = distance.location_lat
                values["location_lng"] = distance.location_lng
            except DistanceUnavailableError:
                warnings.append(_distance_warning())
                values["distance_miles"] = None
                values["origin_lat"] = None
                values["origin_lng"] = None
                values["location_lat"] = None
                values["location_lng"] = None
        else:
            warnings.append(_distance_warning())
            values["distance_miles"] = None
            values["origin_lat"] = None
            values["origin_lng"] = None
            values["location_lat"] = None
            values["location_lng"] = None

    trip = repository.update(trip_id, values)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=TRIP_NOT_FOUND_MESSAGE)
    return _trip_to_response(trip, warnings)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: int, repository: TripRepository = Depends(get_trip_repository)) -> None:
    deleted = repository.delete(trip_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=TRIP_NOT_FOUND_MESSAGE)
