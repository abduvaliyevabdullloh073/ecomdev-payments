import calendar
import re
import sqlite3
from datetime import date
from decimal import Decimal

from app.schemas import PaymentCreate, StudentCreate, StudentUpdate


class StudentNotFound(Exception):
    pass


def from_minor(value: int) -> Decimal:
    return Decimal(value) / 100


def student_record(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "phone": row["phone"],
        "group": row["group_name"],
        "monthly_fee": from_minor(row["monthly_fee_minor"]),
    }


def payment_record(row):
    return {
        "id": row["id"],
        "student_id": row["student_id"],
        "amount": from_minor(row["amount_minor"]),
        "date": row["date"],
    }


def month_bounds(month: str) -> tuple[str, str]:
    if not re.fullmatch(r"[0-9]{4}-(0[1-9]|1[0-2])", month):
        raise ValueError("Месяц должен быть в формате YYYY-MM.")
    year, number = map(int, month.split("-"))
    # date validates year 0000 as well as the supported upper bound.
    first = date(year, number, 1)
    last = date(year, number, calendar.monthrange(year, number)[1])
    return first.isoformat(), last.isoformat()


class PaymentService:
    def __init__(self, connection: sqlite3.Connection):
        self.connection = connection

    def list_students(self):
        rows = self.connection.execute("SELECT * FROM students ORDER BY id").fetchall()
        return [student_record(row) for row in rows]

    def get_student(self, student_id: int):
        row = self.connection.execute(
            "SELECT * FROM students WHERE id = ?", (student_id,)
        ).fetchone()
        if row is None:
            raise StudentNotFound
        return student_record(row)

    def create_student(self, payload: StudentCreate):
        with self.connection:
            cursor = self.connection.execute(
                "INSERT INTO students(name, phone, group_name, monthly_fee_minor) VALUES(?, ?, ?, ?)",
                (payload.name, payload.phone, payload.group, int(payload.monthly_fee * 100)),
            )
            return self.get_student(cursor.lastrowid)

    def update_student(self, student_id: int, payload: StudentCreate | StudentUpdate):
        changes = payload.model_dump(exclude_unset=True)
        # Column names only come from this allowlist, never from request text.
        columns = {
            "name": "name",
            "phone": "phone",
            "group": "group_name",
            "monthly_fee": "monthly_fee_minor",
        }
        values = [
            int(value * 100) if key == "monthly_fee" else value for key, value in changes.items()
        ]
        assignments = ", ".join(f"{columns[key]} = ?" for key in changes)
        with self.connection:
            cursor = self.connection.execute(
                f"UPDATE students SET {assignments} WHERE id = ?", [*values, student_id]
            )
            if cursor.rowcount == 0:
                raise StudentNotFound
            return self.get_student(student_id)

    def delete_student(self, student_id: int):
        with self.connection:
            cursor = self.connection.execute("DELETE FROM students WHERE id = ?", (student_id,))
            if cursor.rowcount == 0:
                raise StudentNotFound

    def list_payments(self, student_id: int):
        self.get_student(student_id)
        rows = self.connection.execute(
            "SELECT * FROM payments WHERE student_id = ? ORDER BY date DESC, id DESC",
            (student_id,),
        ).fetchall()
        return [payment_record(row) for row in rows]

    def create_payment(self, student_id: int, payload: PaymentCreate):
        with self.connection:
            # Existence check and insertion are a single statement (no delete/insert race).
            cursor = self.connection.execute(
                """INSERT INTO payments(student_id, amount_minor, date)
                   SELECT id, ?, ? FROM students WHERE id = ?""",
                (int(payload.amount * 100), payload.date.isoformat(), student_id),
            )
            if cursor.rowcount == 0:
                raise StudentNotFound
            row = self.connection.execute(
                "SELECT * FROM payments WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return payment_record(row)

    def debt_report(self, month: str):
        first, last = month_bounds(month)
        # Filtering in ON (not WHERE) preserves students with no payments.
        rows = self.connection.execute(
            """SELECT s.*, COALESCE(SUM(p.amount_minor), 0) AS paid_minor
               FROM students AS s
               LEFT JOIN payments AS p
                 ON p.student_id = s.id AND p.date BETWEEN ? AND ?
               GROUP BY s.id
               ORDER BY (s.monthly_fee_minor - COALESCE(SUM(p.amount_minor), 0)) DESC, s.id""",
            (first, last),
        ).fetchall()
        debtors = []
        total_debt = 0
        for row in rows:
            debt = row["monthly_fee_minor"] - row["paid_minor"]
            if debt > 0:
                debtors.append(
                    {
                        "student_id": row["id"],
                        "name": row["name"],
                        "phone": row["phone"],
                        "group": row["group_name"],
                        "monthly_fee": from_minor(row["monthly_fee_minor"]),
                        "paid": from_minor(row["paid_minor"]),
                        "debt": from_minor(debt),
                    }
                )
                total_debt += debt
        return {
            "month": month,
            "student_count": len(rows),
            "debtor_count": len(debtors),
            "total_expected": from_minor(sum(row["monthly_fee_minor"] for row in rows)),
            "total_paid": from_minor(sum(row["paid_minor"] for row in rows)),
            "total_debt": from_minor(total_debt),
            "debtors": debtors,
        }
