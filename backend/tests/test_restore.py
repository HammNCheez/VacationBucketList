import json
from datetime import datetime, timezone

from fastapi.testclient import TestClient


def _restore_payload(schema_version: str = "1.0") -> dict:
    exported_at = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc).isoformat()
    created_at = datetime(2026, 2, 1, 8, 0, 0, tzinfo=timezone.utc).isoformat()
    updated_at = datetime(2026, 2, 2, 9, 30, 0, tzinfo=timezone.utc).isoformat()
    comment_created_at = datetime(2026, 2, 3, 10, 45, 0, tzinfo=timezone.utc).isoformat()

    return {
        "schema_version": schema_version,
        "exported_at": exported_at,
        "people": [{"id": 11, "name": "Alex"}],
        "settings": {
            "home_city": "Raleigh",
            "home_zip": "27601",
            "ors_api_key": "restored-ors-key",
        },
        "trips": [
            {
                "id": 21,
                "title": "Rome",
                "location": "Rome",
                "location_lat": 41.9028,
                "location_lng": 12.4964,
                "origin": "Raleigh",
                "origin_lat": 35.7796,
                "origin_lng": -78.6382,
                "distance_miles": 4713.4,
                "status": "Booked",
                "priority": "Must-do",
                "trip_types": ["Culture"],
                "activity_level": 5,
                "travel_time_hours": 9.5,
                "duration_days": 7,
                "target_date_start": "2026-10-01",
                "target_date_end": "2026-10-08",
                "target_date_range": "Fall 2026",
                "notes": "Restored itinerary",
                "created_at": created_at,
                "updated_at": updated_at,
                "cost_items": [
                    {
                        "id": 31,
                        "category": "Flights",
                        "amount": 1200,
                        "currency": "USD",
                    }
                ],
                "comments": [
                    {
                        "id": 41,
                        "body": "Book museum passes",
                        "url": "https://example.com",
                        "created_at": comment_created_at,
                    }
                ],
                "people": [{"id": 11, "name": "Alex"}],
                "total_trip_length": "7 days, 19 hours",
                "per_person_cost": 1200,
                "per_person_currency": "USD",
                "warnings": [],
            }
        ],
    }


def test_restore_replaces_existing_database_data(client: TestClient) -> None:
    assert client.post("/people", json={"name": "Old Person"}).status_code == 201
    assert (
        client.post(
            "/trips",
            json={
                "title": "Old Trip",
                "location": "Old Location",
                "status": "Wishlist",
                "priority": "Nice-to-have",
                "activity_level": 1,
            },
        ).status_code
        == 201
    )

    payload = _restore_payload()
    response = client.post(
        "/export/restore",
        files={"file": ("export.json", json.dumps(payload), "application/json")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["schema_version"] == "1.0"
    assert body["restored_trips"] == 1
    assert body["restored_people"] == 1

    trips_response = client.get("/trips")
    assert trips_response.status_code == 200
    trips = trips_response.json()
    assert len(trips) == 1
    assert trips[0]["id"] == 21
    assert trips[0]["title"] == "Rome"
    assert trips[0]["activity_level"] == 5

    people_response = client.get("/people")
    assert people_response.status_code == 200
    people = people_response.json()
    assert people == [{"id": 11, "name": "Alex"}]

    settings_response = client.get("/settings")
    assert settings_response.status_code == 200
    assert settings_response.json() == {
        "home_city": "Raleigh",
        "home_zip": "27601",
        "ors_api_key": "restored-ors-key",
        "ors_api_key_source": "database",
        "ors_api_key_from_environment": False,
    }


def test_restore_invalid_payload_does_not_wipe_database(client: TestClient) -> None:
    assert (
        client.post(
            "/trips",
            json={
                "title": "Keep Me",
                "location": "Paris",
                "status": "Wishlist",
                "priority": "Must-do",
                "activity_level": 3,
            },
        ).status_code
        == 201
    )

    invalid_payload = {
        "schema_version": "1.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "people": [],
        "settings": {"home_city": None, "home_zip": None, "ors_api_key": None},
    }

    response = client.post(
        "/export/restore",
        files={"file": ("invalid.json", json.dumps(invalid_payload), "application/json")},
    )

    assert response.status_code == 422

    trips_response = client.get("/trips")
    assert trips_response.status_code == 200
    trips = trips_response.json()
    assert len(trips) == 1
    assert trips[0]["title"] == "Keep Me"


def test_restore_rejects_incompatible_schema_major_version(client: TestClient) -> None:
    assert client.post("/people", json={"name": "Taylor"}).status_code == 201

    response = client.post(
        "/export/restore",
        files={"file": ("export.json", json.dumps(_restore_payload("2.0")), "application/json")},
    )

    assert response.status_code == 422
    assert "Unsupported schema_version" in response.json()["detail"]

    people_response = client.get("/people")
    assert people_response.status_code == 200
    people = people_response.json()
    assert len(people) == 1
    assert people[0]["name"] == "Taylor"
