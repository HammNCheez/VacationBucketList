import pytest

from fastapi.testclient import TestClient


def _create_trip_payload() -> dict:
    return {
        "title": "Tokyo Trip",
        "location": "Tokyo",
        "origin": "Raleigh",
        "status": "Wishlist",
        "priority": "Must-do",
        "trip_types": ["camping", "family"],
        "travel_time_hours": 3,
        "duration_days": 7,
        "target_date_range": "summer 2027",
        "notes": "Planning details",
        "cost_items": [
            {"category": "flights", "amount": 600, "currency": "usd"},
            {"category": "lodging", "amount": 400, "currency": "USD"},
        ],
        "comments": [{"body": "Useful link", "url": "https://example.com"}],
        "person_ids": [],
    }


def test_trip_crud_flow(client: TestClient) -> None:
    create_response = client.post("/trips", json=_create_trip_payload())
    assert create_response.status_code == 201
    created = create_response.json()
    trip_id = created["id"]
    assert created["distance_miles"] == pytest.approx(100.0)
    assert created["trip_types"] == ["Camping", "Family"]
    assert created["target_date_range"] == "Summer 2027"
    assert created["total_trip_length"] == "7 days, 6 hours"

    list_response = client.get("/trips")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    get_response = client.get(f"/trips/{trip_id}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == trip_id

    update_response = client.put(
        f"/trips/{trip_id}",
        json={"title": "Updated Tokyo Trip", "notes": "Changed"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Updated Tokyo Trip"

    delete_response = client.delete(f"/trips/{trip_id}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/trips/{trip_id}")
    assert missing_response.status_code == 404


def test_trip_distance_recalculation_behavior(client: TestClient, fake_distance_service) -> None:
    create_response = client.post("/trips", json=_create_trip_payload())
    trip_id = create_response.json()["id"]
    assert fake_distance_service.calls == 1

    update_notes_response = client.put(f"/trips/{trip_id}", json={"notes": "Only notes changed"})
    assert update_notes_response.status_code == 200
    assert fake_distance_service.calls == 1

    update_location_response = client.put(f"/trips/{trip_id}", json={"location": "Kyoto"})
    assert update_location_response.status_code == 200
    assert fake_distance_service.calls == 2


def test_trip_soft_fail_distance(client: TestClient, fake_distance_service) -> None:
    fake_distance_service.should_fail = True
    response = client.post("/trips", json=_create_trip_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["distance_miles"] is None
    assert body["warnings"][0]["code"] == "DISTANCE_UNAVAILABLE"


def test_trip_filters_and_sort(client: TestClient) -> None:
    payload_one = _create_trip_payload()
    payload_one["title"] = "A"
    payload_one["status"] = "Wishlist"
    payload_one["priority"] = "Must-do"
    payload_one["trip_types"] = ["Beach"]

    payload_two = _create_trip_payload()
    payload_two["title"] = "B"
    payload_two["status"] = "Booked"
    payload_two["priority"] = "Nice-to-have"
    payload_two["trip_types"] = ["Culture"]

    assert client.post("/trips", json=payload_one).status_code == 201
    assert client.post("/trips", json=payload_two).status_code == 201

    status_filtered = client.get("/trips", params=[("status", "Wishlist")])
    assert status_filtered.status_code == 200
    assert len(status_filtered.json()) == 1

    multi_status_filtered = client.get("/trips", params=[("status", "Wishlist"), ("status", "Booked")])
    assert multi_status_filtered.status_code == 200
    assert len(multi_status_filtered.json()) == 2

    trip_type_filtered = client.get("/trips", params=[("trip_type", "Culture")])
    assert trip_type_filtered.status_code == 200
    assert len(trip_type_filtered.json()) == 1

    search_filtered = client.get("/trips", params={"search": "tokyo"})
    assert search_filtered.status_code == 200
    assert len(search_filtered.json()) == 2
