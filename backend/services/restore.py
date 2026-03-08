import json
from datetime import datetime, timezone

from pydantic import ValidationError
from sqlalchemy import delete
from sqlalchemy.orm import Session

from models.db import Comment, CostItem, Person, Settings, Trip, trip_people
from models.schemas import RestorePayload, RestoreResponse

SUPPORTED_EXPORT_MAJOR_VERSION = "1"


class RestoreValidationError(Exception):
    pass


def parse_restore_payload(payload: dict) -> RestorePayload:
    try:
        restore_payload = RestorePayload.model_validate(payload)
    except ValidationError as error:
        raise RestoreValidationError("Invalid restore payload format") from error

    major_version = restore_payload.schema_version.split(".", maxsplit=1)[0]
    if major_version != SUPPORTED_EXPORT_MAJOR_VERSION:
        raise RestoreValidationError(
            f"Unsupported schema_version '{restore_payload.schema_version}'. "
            f"Only {SUPPORTED_EXPORT_MAJOR_VERSION}.x exports are supported."
        )

    _validate_restore_references(restore_payload)
    return restore_payload


def _validate_restore_references(payload: RestorePayload) -> None:
    person_ids = [person.id for person in payload.people]
    if len(person_ids) != len(set(person_ids)):
        raise RestoreValidationError("Duplicate person IDs are not allowed")

    trip_ids = [trip.id for trip in payload.trips]
    if len(trip_ids) != len(set(trip_ids)):
        raise RestoreValidationError("Duplicate trip IDs are not allowed")

    known_people_ids = set(person_ids)
    for trip in payload.trips:
        referenced_people_ids = [person.id for person in trip.people]
        if len(referenced_people_ids) != len(set(referenced_people_ids)):
            raise RestoreValidationError(f"Duplicate people in trip {trip.id} are not allowed")

        unknown_people = set(referenced_people_ids) - known_people_ids
        if unknown_people:
            raise RestoreValidationError(
                f"Trip {trip.id} references missing people: {sorted(unknown_people)}"
            )


def restore_database(db: Session, payload: RestorePayload) -> RestoreResponse:
    transaction = db.begin_nested() if db.in_transaction() else db.begin()
    with transaction:
        _wipe_database(db)
        _restore_people(db, payload)
        _restore_trips(db, payload)
        _restore_settings(db, payload)

    return RestoreResponse(
        schema_version=payload.schema_version,
        restored_at=datetime.now(timezone.utc),
        restored_trips=len(payload.trips),
        restored_people=len(payload.people),
    )


def _wipe_database(db: Session) -> None:
    db.execute(delete(trip_people))
    db.execute(delete(Comment))
    db.execute(delete(CostItem))
    db.execute(delete(Trip))
    db.execute(delete(Person))
    db.execute(delete(Settings))


def _restore_people(db: Session, payload: RestorePayload) -> None:
    for person in payload.people:
        db.add(Person(id=person.id, name=person.name))
    db.flush()


def _restore_trips(db: Session, payload: RestorePayload) -> None:
    people_by_id = {person.id: person for person in db.query(Person).all()}

    for trip_payload in payload.trips:
        trip = Trip(
            id=trip_payload.id,
            title=trip_payload.title,
            location=trip_payload.location,
            location_lat=trip_payload.location_lat,
            location_lng=trip_payload.location_lng,
            origin=trip_payload.origin,
            origin_lat=trip_payload.origin_lat,
            origin_lng=trip_payload.origin_lng,
            distance_miles=trip_payload.distance_miles,
            status=trip_payload.status,
            priority=trip_payload.priority,
            trip_types=json.dumps(trip_payload.trip_types),
            activity_level=trip_payload.activity_level,
            travel_time_hours=trip_payload.travel_time_hours,
            duration_days=trip_payload.duration_days,
            target_date_start=trip_payload.target_date_start,
            target_date_end=trip_payload.target_date_end,
            target_date_range=trip_payload.target_date_range,
            notes=trip_payload.notes,
            created_at=trip_payload.created_at,
            updated_at=trip_payload.updated_at,
        )

        for cost_item_payload in trip_payload.cost_items:
            trip.cost_items.append(
                CostItem(
                    id=cost_item_payload.id,
                    category=cost_item_payload.category,
                    amount=cost_item_payload.amount,
                    currency=cost_item_payload.currency,
                )
            )

        for comment_payload in trip_payload.comments:
            trip.comments.append(
                Comment(
                    id=comment_payload.id,
                    body=comment_payload.body,
                    url=comment_payload.url,
                    created_at=comment_payload.created_at,
                )
            )

        trip.people = [people_by_id[person.id] for person in trip_payload.people]
        db.add(trip)

    db.flush()


def _restore_settings(db: Session, payload: RestorePayload) -> None:
    if payload.settings.home_city is None and payload.settings.home_zip is None:
        return

    db.add(
        Settings(
            id=1,
            home_city=payload.settings.home_city,
            home_zip=payload.settings.home_zip,
        )
    )
