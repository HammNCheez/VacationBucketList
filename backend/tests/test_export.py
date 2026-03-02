from fastapi.testclient import TestClient


def test_export_empty(client: TestClient) -> None:
    response = client.get("/export")
    assert response.status_code == 200
    payload = response.json()
    assert payload["schema_version"] == "1.0"
    assert "exported_at" in payload
    assert payload["trips"] == []
    assert payload["people"] == []
    assert payload["settings"] == {"home_city": None, "home_zip": None}


def test_export_contains_nested_data(client: TestClient) -> None:
    person_response = client.post("/people", json={"name": "Alex"})
    person_id = person_response.json()["id"]

    payload = {
        "title": "Export Trip",
        "location": "Rome",
        "status": "Wishlist",
        "priority": "Must-do",
        "trip_types": ["culture"],
        "person_ids": [person_id],
        "cost_items": [{"category": "flights", "amount": 700, "currency": "USD"}],
        "comments": [{"body": "note", "url": "https://example.com"}],
    }
    assert client.post("/trips", json=payload).status_code == 201

    response = client.get("/export")
    assert response.status_code == 200
    body = response.json()
    assert len(body["trips"]) == 1
    assert len(body["trips"][0]["cost_items"]) == 1
    assert len(body["trips"][0]["comments"]) == 1
    assert len(body["trips"][0]["people"]) == 1
