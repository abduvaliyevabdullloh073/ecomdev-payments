import sqlite3
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, local_today
from app.main import create_app
from app.seed import seed_demo


def test_empty_database_and_service_endpoints(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/students").json() == []
    config = client.get("/config").json()
    assert config["today"] == local_today().isoformat()
    assert config["timezone"] == "Asia/Tashkent"
    assert client.get("/debtors?month=2026-10").json() == {
        "month": "2026-10",
        "student_count": 0,
        "debtor_count": 0,
        "total_expected": "0.00",
        "total_paid": "0.00",
        "total_debt": "0.00",
        "debtors": [],
    }


def test_student_crud(client, student_factory):
    student = student_factory(name="  Ali Valiyev  ", monthly_fee="125.50")
    path = f"/students/{student['id']}"
    assert student["name"] == "Ali Valiyev"
    assert student["monthly_fee"] == "125.50"
    assert client.get(path).json() == student
    assert client.get("/students").json() == [student]
    changed = client.patch(path, json={"monthly_fee": "200.00"})
    assert changed.status_code == 200
    assert changed.json() == {**student, "monthly_fee": "200.00"}
    replacement = {"name": "Madina", "phone": "+998901111111", "group": "English", "monthly_fee": 0}
    response = client.put(path, json=replacement)
    assert response.status_code == 200
    assert response.json() == {**replacement, "id": student["id"], "monthly_fee": "0.00"}
    assert client.delete(path).status_code == 204
    assert client.get(path).status_code == 404
    assert client.get("/students").json() == []


@pytest.mark.parametrize(
    "field,value",
    [
        ("name", ""),
        ("name", "   "),
        ("name", "x" * 121),
        ("name", None),
        ("group", ""),
        ("group", "   "),
        ("group", "x" * 81),
        ("phone", "123"),
        ("phone", "a phone"),
        ("phone", "+1234567890123456"),
        ("phone", 998901234567),
        ("phone", "123+4567"),
        ("monthly_fee", -1),
        ("monthly_fee", True),
        ("monthly_fee", None),
        ("monthly_fee", "NaN"),
        ("monthly_fee", "Infinity"),
        ("monthly_fee", "abc"),
        ("monthly_fee", "0.001"),
        ("monthly_fee", "0.10000000000000000000000000001"),
        ("monthly_fee", "1000000000.01"),
        ("monthly_fee", {}),
    ],
)
def test_invalid_student_input_is_rejected(client, field, value):
    payload = {"name": "Ali", "phone": "+998901234567", "group": "Python", "monthly_fee": "100.00"}
    payload[field] = value
    response = client.post("/students", json=payload)
    assert response.status_code == 422
    assert response.json()["errors"]
    assert client.get("/students").json() == []


@pytest.mark.parametrize(
    "payload", [{}, {"name": None}, {"monthly_fee": None}, {"unknown": "field"}]
)
def test_invalid_patch_does_not_change_student(client, student_factory, payload):
    student = student_factory()
    path = f"/students/{student['id']}"
    assert client.patch(path, json=payload).status_code == 422
    assert client.get(path).json() == student


def test_put_requires_all_fields_and_unknown_fields_rejected(client, student_factory):
    student = student_factory()
    assert client.put(f"/students/{student['id']}", json={"name": "New"}).status_code == 422
    assert client.post("/students", json={**student, "extra": "x"}).status_code == 422


@pytest.mark.parametrize(
    "method,path,payload",
    [
        ("get", "/students/999", None),
        ("delete", "/students/999", None),
        ("patch", "/students/999", {"name": "New"}),
        (
            "put",
            "/students/999",
            {"name": "Ali", "phone": "998901234567", "group": "A", "monthly_fee": 1},
        ),
        ("get", "/students/999/payments", None),
        ("post", "/students/999/payments", {"amount": 1, "date": "2026-10-10"}),
    ],
)
def test_missing_student_returns_404(client, method, path, payload):
    response = client.request(method, path, **({"json": payload} if payload is not None else {}))
    assert response.status_code == 404
    assert response.json() == {"detail": "Ученик не найден."}


@pytest.mark.parametrize("student_id", ["0", "-1", "abc", "1.5"])
def test_invalid_student_id(client, student_id):
    assert client.get(f"/students/{student_id}").status_code == 422


def test_payments_belong_to_student_and_are_sorted(client, student_factory, payment_factory):
    first = student_factory()
    other = student_factory(name="Other")
    payment_factory(first, "15.25", "2026-10-01")
    payment_factory(first, "40", "2026-10-15")
    latest = payment_factory(first, "12.05", "2026-10-15")
    payment_factory(other, "999", "2026-10-20")
    payments = client.get(f"/students/{first['id']}/payments").json()
    assert [item["amount"] for item in payments] == ["12.05", "40.00", "15.25"]
    assert payments[0]["id"] == latest["id"]
    assert all(item["student_id"] == first["id"] for item in payments)


@pytest.mark.parametrize(
    "amount", [0, -1, "0.00", True, "0.001", "NaN", "Infinity", "abc", None, [], "1000000000.01"]
)
def test_invalid_payment_amount(client, student_factory, amount):
    student = student_factory()
    path = f"/students/{student['id']}/payments"
    assert client.post(path, json={"amount": amount, "date": "2026-10-10"}).status_code == 422
    assert client.get(path).json() == []


@pytest.mark.parametrize(
    "payment_date",
    [
        "2026-02-29",
        "2026-13-01",
        "2026-04-31",
        "2026-1-01",
        "2026-10-01T00:00:00",
        "20261001",
        "0000-01-01",
        "yesterday",
        1760054400,
        None,
    ],
)
def test_invalid_payment_date(client, student_factory, payment_date):
    student = student_factory()
    assert (
        client.post(
            f"/students/{student['id']}/payments", json={"amount": 1, "date": payment_date}
        ).status_code
        == 422
    )


@pytest.mark.parametrize(
    "month",
    [
        "2026-1",
        "2026-00",
        "2026-13",
        "0000-10",
        "26-10",
        "2026-10-01",
        "2026-10\n",
        "2026-10' OR 1=1--",
        "",
        "10000-01",
    ],
)
def test_invalid_month(client, month):
    assert client.get("/debtors", params={"month": month}).status_code == 422


def test_month_is_required(client):
    assert client.get("/debtors").status_code == 422


def test_report_includes_unpaid_partial_and_excludes_full_overpaid_and_free(
    client, student_factory, payment_factory
):
    unpaid = student_factory(name="Unpaid")
    partial = student_factory(name="Partial")
    full = student_factory(name="Full")
    overpaid = student_factory(name="Overpaid")
    student_factory(name="Free", monthly_fee=0)
    outside = student_factory(name="Other month")
    payment_factory(partial, "20.10", "2026-01-01")
    payment_factory(partial, "30.20", "2026-01-31")
    payment_factory(full, "100", "2026-01-15")
    payment_factory(overpaid, "150", "2026-01-15")
    payment_factory(outside, "100", "2025-12-31")
    payment_factory(outside, "100", "2026-02-01")
    report = client.get("/debtors?month=2026-01").json()
    assert report["student_count"] == 6
    assert report["debtor_count"] == 3
    assert report["total_expected"] == "500.00"
    assert report["total_paid"] == "300.30"
    assert report["total_debt"] == "249.70"
    assert [(item["student_id"], item["paid"], item["debt"]) for item in report["debtors"]] == [
        (unpaid["id"], "0.00", "100.00"),
        (outside["id"], "0.00", "100.00"),
        (partial["id"], "50.30", "49.70"),
    ]


def test_decimal_precision_no_phantom_debt(client, student_factory, payment_factory):
    student = student_factory(monthly_fee="0.30")
    payment_factory(student, "0.10")
    payment_factory(student, "0.20")
    report = client.get("/debtors?month=2026-10").json()
    assert report["debtors"] == []
    assert report["total_paid"] == "0.30"
    assert report["total_debt"] == "0.00"


@pytest.mark.parametrize(
    "month,payment_date,outside_date",
    [
        ("2024-02", "2024-02-29", "2024-03-01"),
        ("2026-12", "2026-12-31", "2027-01-01"),
        ("0001-01", "0001-01-31", "0001-02-01"),
        ("9999-12", "9999-12-31", "9999-11-30"),
    ],
)
def test_calendar_boundaries(
    client, student_factory, payment_factory, month, payment_date, outside_date
):
    student = student_factory()
    payment_factory(student, "30", payment_date)
    payment_factory(student, "70", outside_date)
    report = client.get("/debtors", params={"month": month}).json()
    assert report["total_paid"] == "30.00"
    assert report["total_debt"] == "70.00"


def test_overpayment_does_not_cover_someone_else_or_next_month(
    client, student_factory, payment_factory
):
    student = student_factory(name="Overpaid")
    student_factory(name="Unpaid")
    payment_factory(student, "250")
    assert client.get("/debtors?month=2026-10").json()["total_debt"] == "100.00"
    assert client.get("/debtors?month=2026-11").json()["total_debt"] == "200.00"


def test_fee_update_recalculates_report(client, student_factory, payment_factory):
    student = student_factory()
    payment_factory(student, "20")
    client.patch(f"/students/{student['id']}", json={"monthly_fee": "50.50"})
    assert client.get("/debtors?month=2026-10").json()["total_debt"] == "30.50"


def test_aggregates_can_exceed_single_amount_limit(client, student_factory, payment_factory):
    for _ in range(2):
        student = student_factory(monthly_fee="1000000000.00")
        payment_factory(student, "1000000000.00")
        payment_factory(student, "1.00")
    report = client.get("/debtors?month=2026-10")
    assert report.status_code == 200
    assert report.json()["total_expected"] == "2000000000.00"
    assert report.json()["total_paid"] == "2000000002.00"


def test_delete_cascades_payments(client, settings, student_factory, payment_factory):
    student = student_factory()
    payment_factory(student)
    assert client.delete(f"/students/{student['id']}").content == b""
    with sqlite3.connect(settings.database_path) as connection:
        assert connection.execute("SELECT COUNT(*) FROM payments").fetchone()[0] == 0
    assert client.get("/debtors?month=2026-10").json()["debtors"] == []


def test_data_survives_application_restart(settings):
    with TestClient(create_app(settings)) as client:
        student = client.post(
            "/students",
            json={
                "name": "Persistent",
                "phone": "+998901234567",
                "group": "A",
                "monthly_fee": "100.00",
            },
        ).json()
        client.post(
            f"/students/{student['id']}/payments", json={"amount": "40", "date": "2026-10-21"}
        )
    with TestClient(create_app(settings)) as client:
        assert client.get(f"/students/{student['id']}").json() == student
        assert client.get("/debtors?month=2026-10").json()["total_debt"] == "60.00"


def test_parallel_payments_are_not_lost(client, student_factory):
    student = student_factory(monthly_fee="2.00")

    def pay(_):
        return client.post(
            f"/students/{student['id']}/payments", json={"amount": "0.10", "date": "2026-10-21"}
        ).status_code

    with ThreadPoolExecutor(max_workers=4) as executor:
        assert list(executor.map(pay, range(12))) == [201] * 12
    report = client.get("/debtors?month=2026-10").json()
    assert report["total_paid"] == "1.20"
    assert report["total_debt"] == "0.80"


def test_input_is_stored_as_data_not_sql(client, student_factory):
    payload = "Robert'); DROP TABLE students;--"
    student = student_factory(name=payload)
    assert client.get(f"/students/{student['id']}").json()["name"] == payload
    assert client.get("/health").status_code == 200


def test_demo_seed_is_explicit_and_repeat_safe(settings):
    with TestClient(create_app(settings)) as client:
        assert client.get("/students").json() == []
    assert seed_demo(settings) is True
    assert seed_demo(settings) is False
    with TestClient(create_app(settings)) as client:
        assert len(client.get("/students").json()) == 6
        report = client.get("/debtors", params={"month": local_today().strftime("%Y-%m")}).json()
        assert report["total_debt"] == "1280000.00"
        assert report["debtor_count"] == 4


def test_database_path_environment_is_used(monkeypatch, tmp_path):
    path = tmp_path / "nested" / "custom.sqlite3"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    assert Settings.from_env().database_path == path
    with TestClient(create_app()) as client:
        assert client.get("/health").status_code == 200
    assert path.exists()


def test_web_assets_docs_and_security_headers(client):
    response = client.get("/")
    assert response.status_code == 200
    assert '<html lang="ru">' in response.text
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "script-src 'self'" in response.headers["content-security-policy"]
    for path in [
        "/static/app.js",
        "/static/styles.css",
        "/static/favicon.svg",
        "/docs",
        "/openapi.json",
    ]:
        assert client.get(path).status_code == 200
    assert "/debtors" in client.get("/openapi.json").json()["paths"]
