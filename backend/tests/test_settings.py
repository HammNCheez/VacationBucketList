from fastapi.testclient import TestClient


def test_get_settings_defaults(client: TestClient) -> None:
    response = client.get("/settings")
    assert response.status_code == 200
    assert response.json() == {
        "home_city": None,
        "home_zip": None,
        "ors_api_key": None,
        "ors_api_key_source": "none",
        "ors_api_key_from_environment": False,
    }


def test_put_and_get_settings(client: TestClient) -> None:
    put_response = client.put(
        "/settings",
        json={
            "home_city": "Raleigh",
            "home_zip": "27601",
            "ors_api_key": "test-ors-key",
        },
    )
    assert put_response.status_code == 200

    get_response = client.get("/settings")
    assert get_response.status_code == 200
    assert get_response.json() == {
        "home_city": "Raleigh",
        "home_zip": "27601",
        "ors_api_key": "test-ors-key",
        "ors_api_key_source": "database",
        "ors_api_key_from_environment": False,
    }


def test_get_settings_prefers_environment_key_source(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setenv("ORS_API_KEY", "env-ors-key")

    response = client.get("/settings")

    assert response.status_code == 200
    body = response.json()
    assert body["ors_api_key_source"] == "environment"
    assert body["ors_api_key_from_environment"] is True
