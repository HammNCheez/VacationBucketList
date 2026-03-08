from fastapi.testclient import TestClient


def test_autocomplete_values(client: TestClient) -> None:
    payload = {
        "title": "Trip",
        "location": "Tokyo",
        "status": "Wishlist",
        "priority": "Must-do",
        "activity_level": 2,
        "trip_types": ["camping"],
        "cost_items": [{"category": "flights", "amount": 100}],
        "target_date_range": "summer 2027",
    }
    assert client.post("/trips", json=payload).status_code == 201

    trip_types = client.get("/trips/autocomplete", params={"field": "trip_type"})
    assert trip_types.status_code == 200
    assert trip_types.json() == ["Camping"]

    target_ranges = client.get("/trips/autocomplete", params={"field": "target_date_range"})
    assert target_ranges.status_code == 200
    assert target_ranges.json() == ["Summer 2027"]

    cost_categories = client.get("/trips/autocomplete", params={"field": "cost_category"})
    assert cost_categories.status_code == 200
    assert cost_categories.json() == ["Flights"]


def test_autocomplete_invalid_field(client: TestClient) -> None:
    response = client.get("/trips/autocomplete", params={"field": "unknown"})
    assert response.status_code == 400
