import logging
from datetime import date
from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session

from database.connection import get_db
from models.db import Trip
from models.schemas import (
    TripCreate,
    TripMutationResponse,
    TripPriority,
    TripRead,
    TripStatus,
    TripUpdate,
    WarningMessage,
)
from repositories.settings_repo import SettingsRepository
from repositories.trip_repo import TripRepository
from services.distance import DistanceResult, DistanceService, DistanceUnavailableError
from services.formatting import normalize_title_case_list, to_title_case, trip_types_from_db

router = APIRouter()
logger = logging.getLogger(__name__)

TRIP_NOT_FOUND_MESSAGE = "Trip not found"
DISTANCE_WARNING_MESSAGE = "Distance could not be calculated right now."


def get_trip_repository(db: Session = Depends(get_db)) -> TripRepository:
    return TripRepository(db)


def get_settings_repository(db: Session = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


def get_distance_service() -> DistanceService:
    return DistanceService()


def _format_number(value: float) -> str:
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.2f}".rstrip("0").rstrip(".")


def _build_total_trip_length(duration_days: float, travel_time_hours: float) -> str:
    # Multiply travel_time_hours by 2 to account for the round trip (outbound + return).
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


def trip_to_response(
    trip: Trip, warnings: list[WarningMessage] | None = None
) -> TripMutationResponse:
    trip_types = trip_types_from_db(trip.trip_types)
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
        status=cast(TripStatus, trip.status),
        priority=cast(TripPriority, trip.priority),
        trip_types=trip_types,
        activity_level=trip.activity_level,
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


def _apply_distance_result(values: dict, distance: DistanceResult) -> None:
    values["distance_miles"] = distance.distance_miles
    values["origin_lat"] = distance.origin_lat
    values["origin_lng"] = distance.origin_lng
    values["location_lat"] = distance.location_lat
    values["location_lng"] = distance.location_lng


def _clear_distance(values: dict) -> None:
    values["distance_miles"] = None
    values["origin_lat"] = None
    values["origin_lng"] = None
    values["location_lat"] = None
    values["location_lng"] = None


def _recalculate_distance(
    values: dict,
    *,
    origin: str | None,
    location: str | None,
    distance_service: DistanceService,
    warnings: list[WarningMessage],
    log_context: dict,
) -> None:
    if not origin or not location:
        warnings.append(_distance_warning())
        _clear_distance(values)
        logger.warning("distance_unavailable_missing_input", extra=log_context)
        return

    try:
        distance = distance_service.calculate(origin, location)
        _apply_distance_result(values, distance)
    except DistanceUnavailableError as error:
        warnings.append(_distance_warning())
        _clear_distance(values)
        logger.warning("distance_unavailable_ors", extra={**log_context, "error": str(error)})


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


@router.get("")
def list_trips(
    repository: Annotated[TripRepository, Depends(get_trip_repository)],
    status: Annotated[list[str] | None, Query()] = None,
    priority: Annotated[list[str] | None, Query()] = None,
    trip_type: Annotated[list[str] | None, Query()] = None,
    activity_level: Annotated[list[int] | None, Query()] = None,
    distance_min: Annotated[float | None, Query(ge=0)] = None,
    distance_max: Annotated[float | None, Query(ge=0)] = None,
    search: Annotated[str | None, Query()] = None,
    target_date_start: Annotated[date | None, Query()] = None,
    target_date_end: Annotated[date | None, Query()] = None,
) -> list[TripRead]:
    status = status or []
    priority = priority or []
    trip_type = trip_type or []
    activity_level = activity_level or []

    if any(level < 1 or level > 5 for level in activity_level):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="activity_level values must be between 1 and 5",
        )

    if distance_min is not None and distance_max is not None and distance_min > distance_max:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="distance_min must be <= distance_max",
        )

    trips = repository.list(
        statuses=status,
        priorities=priority,
        trip_types=trip_type,
        activity_levels=activity_level,
        distance_min=distance_min,
        distance_max=distance_max,
        search=search,
        target_date_start=target_date_start,
        target_date_end=target_date_end,
    )
    return [trip_to_response(trip) for trip in trips]


@router.get("/autocomplete")
def autocomplete_values(
    field: str, repository: Annotated[TripRepository, Depends(get_trip_repository)]
) -> list[str]:
    allowed = {"trip_type", "target_date_range", "cost_category"}
    if field not in allowed:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Invalid field")
    return repository.autocomplete_values(field)


@router.get("/{trip_id}")
def get_trip(
    trip_id: int,
    repository: Annotated[TripRepository, Depends(get_trip_repository)],
) -> TripRead:
    trip = repository.get(trip_id)
    if not trip:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail=TRIP_NOT_FOUND_MESSAGE
        )
    return trip_to_response(trip)


@router.post("", status_code=http_status.HTTP_201_CREATED)
def create_trip(
    payload: TripCreate,
    repository: Annotated[TripRepository, Depends(get_trip_repository)],
    settings_repository: Annotated[SettingsRepository, Depends(get_settings_repository)],
    distance_service: Annotated[DistanceService, Depends(get_distance_service)],
) -> TripMutationResponse:
    values = _normalize_payload(payload)

    settings = settings_repository.get()
    if not values.get("origin"):
        values["origin"] = settings.home_city if settings and settings.home_city else None

    warnings: list[WarningMessage] = []
    _recalculate_distance(
        values,
        origin=values.get("origin"),
        location=values.get("location"),
        distance_service=distance_service,
        warnings=warnings,
        log_context={"trip_title": values.get("title"), "location": values.get("location")},
    )

    trip = repository.create(values)
    return trip_to_response(trip, warnings)


@router.put("/{trip_id}")
def update_trip(
    trip_id: int,
    payload: TripUpdate,
    repository: Annotated[TripRepository, Depends(get_trip_repository)],
    settings_repository: Annotated[SettingsRepository, Depends(get_settings_repository)],
    distance_service: Annotated[DistanceService, Depends(get_distance_service)],
) -> TripMutationResponse:
    existing = repository.get(trip_id)
    if not existing:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail=TRIP_NOT_FOUND_MESSAGE
        )

    values = _normalize_payload(payload)
    if "origin" in values and not values["origin"]:
        settings = settings_repository.get()
        values["origin"] = settings.home_city if settings and settings.home_city else None

    origin_after = values.get("origin", existing.origin)
    location_after = values.get("location", existing.location)

    should_recalculate = "origin" in values or "location" in values
    warnings: list[WarningMessage] = []

    if should_recalculate:
        _recalculate_distance(
            values,
            origin=origin_after,
            location=location_after,
            distance_service=distance_service,
            warnings=warnings,
            log_context={"trip_id": trip_id, "location": location_after},
        )

    trip = repository.update(trip_id, values)
    if not trip:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail=TRIP_NOT_FOUND_MESSAGE
        )
    return trip_to_response(trip, warnings)


@router.delete("/{trip_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: int,
    repository: Annotated[TripRepository, Depends(get_trip_repository)],
) -> None:
    deleted = repository.delete(trip_id)
    if not deleted:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND, detail=TRIP_NOT_FOUND_MESSAGE
        )
