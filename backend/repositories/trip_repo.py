from __future__ import annotations

import json
from datetime import date
from typing import Any

from sqlalchemy.orm import Session, joinedload

from models.db import Comment, CostItem, Person, Trip
from repositories.base import ITripRepository

PRIORITY_SORT_ORDER = {"Must-do": 0, "Want-to": 1, "Nice-to-have": 2}


class TripRepository(ITripRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _base_query(self):
        return self.db.query(Trip).options(
            joinedload(Trip.cost_items), joinedload(Trip.comments), joinedload(Trip.people)
        )

    def get(self, trip_id: int) -> Trip | None:
        return self._base_query().filter(Trip.id == trip_id).first()

    def all(self) -> list[Trip]:
        return self._base_query().all()

    def _trip_types_from_db(self, value: str) -> list[str]:
        try:
            loaded = json.loads(value)
            if isinstance(loaded, list):
                return [str(item) for item in loaded]
        except json.JSONDecodeError:
            pass
        return []

    def _trip_types_to_db(self, values: list[str]) -> str:
        return json.dumps(values)

    def _matches_status_priority(
        self,
        trip: Trip,
        statuses: list[str],
        priorities: list[str],
    ) -> bool:
        if statuses and trip.status not in statuses:
            return False
        if priorities and trip.priority not in priorities:
            return False
        return True

    def _matches_trip_type(self, trip: Trip, trip_types: list[str]) -> bool:
        if not trip_types:
            return True
        parsed_trip_types = set(self._trip_types_from_db(trip.trip_types))
        return bool(parsed_trip_types.intersection(set(trip_types)))

    def _matches_distance(
        self, trip: Trip, distance_min: float | None, distance_max: float | None
    ) -> bool:
        if distance_min is not None and (
            trip.distance_miles is None or trip.distance_miles < distance_min
        ):
            return False
        if distance_max is not None and (
            trip.distance_miles is None or trip.distance_miles > distance_max
        ):
            return False
        return True

    def _matches_search(self, trip: Trip, search: str | None) -> bool:
        if not search:
            return True
        search_value = search.lower()
        return search_value in trip.title.lower() or search_value in trip.location.lower()

    def _matches_dates(
        self,
        trip: Trip,
        target_date_start: date | None,
        target_date_end: date | None,
    ) -> bool:
        if (
            target_date_start
            and trip.target_date_start
            and trip.target_date_start < target_date_start
        ):
            return False
        if target_date_end and trip.target_date_end and trip.target_date_end > target_date_end:
            return False
        return True

    def _matches_filters(
        self,
        trip: Trip,
        *,
        statuses: list[str],
        priorities: list[str],
        trip_types: list[str],
        distance_min: float | None,
        distance_max: float | None,
        search: str | None,
        target_date_start: date | None,
        target_date_end: date | None,
    ) -> bool:
        return (
            self._matches_status_priority(trip, statuses, priorities)
            and self._matches_trip_type(trip, trip_types)
            and self._matches_distance(trip, distance_min, distance_max)
            and self._matches_search(trip, search)
            and self._matches_dates(trip, target_date_start, target_date_end)
        )

    def _apply_children(self, trip: Trip, payload: dict[str, Any]) -> None:
        if "cost_items" in payload:
            trip.cost_items.clear()
            for item in payload["cost_items"]:
                trip.cost_items.append(
                    CostItem(
                        category=item["category"],
                        amount=item["amount"],
                        currency=item.get("currency"),
                    )
                )

        if "comments" in payload:
            trip.comments.clear()
            for item in payload["comments"]:
                trip.comments.append(Comment(body=item["body"], url=item.get("url")))

        if "person_ids" in payload:
            person_ids = payload["person_ids"]
            if person_ids:
                people = self.db.query(Person).filter(Person.id.in_(person_ids)).all()
            else:
                people = []
            trip.people = people

    def create(self, payload: dict[str, Any]) -> Trip:
        trip = Trip(
            title=payload["title"],
            location=payload["location"],
            origin=payload.get("origin"),
            status=payload["status"],
            priority=payload["priority"],
            trip_types=self._trip_types_to_db(payload.get("trip_types", [])),
            travel_time_hours=payload.get("travel_time_hours", 0),
            duration_days=payload.get("duration_days", 0),
            target_date_start=payload.get("target_date_start"),
            target_date_end=payload.get("target_date_end"),
            target_date_range=payload.get("target_date_range"),
            notes=payload.get("notes"),
            location_lat=payload.get("location_lat"),
            location_lng=payload.get("location_lng"),
            origin_lat=payload.get("origin_lat"),
            origin_lng=payload.get("origin_lng"),
            distance_miles=payload.get("distance_miles"),
        )

        self.db.add(trip)
        self.db.flush()
        self._apply_children(trip, payload)
        self.db.commit()
        self.db.refresh(trip)
        return self.get(trip.id) or trip

    def update(self, trip_id: int, payload: dict[str, Any]) -> Trip | None:
        trip = self.get(trip_id)
        if not trip:
            return None

        for key in [
            "title",
            "location",
            "origin",
            "status",
            "priority",
            "travel_time_hours",
            "duration_days",
            "target_date_start",
            "target_date_end",
            "target_date_range",
            "notes",
            "location_lat",
            "location_lng",
            "origin_lat",
            "origin_lng",
            "distance_miles",
        ]:
            if key in payload:
                setattr(trip, key, payload[key])

        if "trip_types" in payload:
            trip.trip_types = self._trip_types_to_db(payload["trip_types"])

        self._apply_children(trip, payload)
        self.db.commit()
        self.db.refresh(trip)
        return self.get(trip.id)

    def delete(self, trip_id: int) -> bool:
        trip = self.db.query(Trip).filter(Trip.id == trip_id).first()
        if not trip:
            return False
        self.db.delete(trip)
        self.db.commit()
        return True

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
        trips = self._base_query().all()

        filtered = [
            trip
            for trip in trips
            if self._matches_filters(
                trip,
                statuses=statuses,
                priorities=priorities,
                trip_types=trip_types,
                distance_min=distance_min,
                distance_max=distance_max,
                search=search,
                target_date_start=target_date_start,
                target_date_end=target_date_end,
            )
        ]
        filtered.sort(
            key=lambda trip: (
                PRIORITY_SORT_ORDER.get(trip.priority, 99),
                trip.distance_miles if trip.distance_miles is not None else float("inf"),
            )
        )
        return filtered

    def autocomplete_values(self, field: str) -> list[str]:
        values: set[str] = set()
        if field == "trip_type":
            for trip in self.db.query(Trip).all():
                values.update(self._trip_types_from_db(trip.trip_types))
        elif field == "target_date_range":
            rows = (
                self.db.query(Trip.target_date_range)
                .filter(Trip.target_date_range.isnot(None))
                .all()
            )
            values.update(value for (value,) in rows if value)
        elif field == "cost_category":
            rows = self.db.query(CostItem.category).all()
            values.update(value for (value,) in rows if value)

        return sorted(values)
