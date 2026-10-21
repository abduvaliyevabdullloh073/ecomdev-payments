import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def settings(tmp_path):
    return Settings(database_path=tmp_path / "test.sqlite3")


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def student_factory(client):
    def create(**changes):
        payload = {
            "name": "Ali Valiyev",
            "phone": "+998 90 123 45 67",
            "group": "Python-01",
            "monthly_fee": "100.00",
        }
        payload.update(changes)
        response = client.post("/students", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return create


@pytest.fixture
def payment_factory(client):
    def create(student, amount="20.00", date="2026-10-15"):
        response = client.post(
            f"/students/{student['id']}/payments", json={"amount": amount, "date": date}
        )
        assert response.status_code == 201, response.text
        return response.json()

    return create
