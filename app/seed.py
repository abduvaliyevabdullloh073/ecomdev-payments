"""Explicit, repeat-safe demo data. Never runs on application startup."""

from app.config import Settings, local_today
from app.database import Database

DEMO_STUDENTS = [
    ("Aziza Karimova", "+998 90 000 00 01", "Python-01", 650000, 250000),
    ("Javohir Rustamov", "+998 90 000 00 02", "Frontend-02", 750000, 750000),
    ("Madina Aliyeva", "+998 90 000 00 03", "English B2", 480000, 0),
    ("Bekzod Tursunov", "+998 90 000 00 04", "Python-01", 650000, 450000),
    ("Sardor Abdullayev", "+998 90 000 00 05", "Design-01", 600000, 650000),
    ("Nilufar Usmonova", "+998 90 000 00 06", "English B2", 550000, 350000),
]


def seed_demo(settings: Settings | None = None) -> bool:
    database = Database((settings or Settings.from_env()).database_path)
    database.initialize()
    payment_date = local_today().replace(day=1).isoformat()
    with database.connect() as connection, connection:
        connection.execute("BEGIN IMMEDIATE")
        if connection.execute("SELECT COUNT(*) FROM students").fetchone()[0]:
            return False
        for name, phone, group, fee, paid in DEMO_STUDENTS:
            cursor = connection.execute(
                "INSERT INTO students(name, phone, group_name, monthly_fee_minor) VALUES(?, ?, ?, ?)",
                (name, phone, group, fee * 100),
            )
            if paid:
                connection.execute(
                    "INSERT INTO payments(student_id, amount_minor, date) VALUES(?, ?, ?)",
                    (cursor.lastrowid, paid * 100, payment_date),
                )
    return True


if __name__ == "__main__":
    if seed_demo():
        print("Добавлены 6 вымышленных учеников и 5 платежей за текущий месяц.")
    else:
        print("Демо-данные не добавлены: база уже содержит учеников. Данные не изменены.")
