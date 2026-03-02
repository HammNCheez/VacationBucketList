from fastapi.testclient import TestClient


def test_get_settings_defaults(client: TestClient) -> None:
    response = client.get("/settings")
    assert response.status_code == 200
    assert response.json() == {"home_city": None, "home_zip": None}


def test_put_and_get_settings(client: TestClient) -> None:
    put_response = client.put("/settings", json={"home_city": "Raleigh", "home_zip": "27601"})
    assert put_response.status_code == 200

    get_response = client.get("/settings")
    assert get_response.status_code == 200
    assert get_response.json() == {"home_city": "Raleigh", "home_zip": "27601"}
