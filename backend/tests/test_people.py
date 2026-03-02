from fastapi.testclient import TestClient


def test_people_create_list_delete(client: TestClient) -> None:
    create_response = client.post("/people", json={"name": "Alice"})
    assert create_response.status_code == 201
    person_id = create_response.json()["id"]

    list_response = client.get("/people")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    delete_response = client.delete(f"/people/{person_id}")
    assert delete_response.status_code == 204

    list_response_after_delete = client.get("/people")
    assert list_response_after_delete.status_code == 200
    assert list_response_after_delete.json() == []


def test_duplicate_names_allowed(client: TestClient) -> None:
    assert client.post("/people", json={"name": "Chris"}).status_code == 201
    assert client.post("/people", json={"name": "Chris"}).status_code == 201

    people = client.get("/people").json()
    assert len(people) == 2
