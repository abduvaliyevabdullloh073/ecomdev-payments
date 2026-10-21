BEGIN IMMEDIATE;

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
    phone TEXT NOT NULL,
    group_name TEXT NOT NULL CHECK(length(trim(group_name)) BETWEEN 1 AND 80),
    monthly_fee_minor INTEGER NOT NULL
        CHECK(typeof(monthly_fee_minor) = 'integer'
              AND monthly_fee_minor BETWEEN 0 AND 100000000000)
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount_minor INTEGER NOT NULL
        CHECK(typeof(amount_minor) = 'integer'
              AND amount_minor BETWEEN 1 AND 100000000000),
    date TEXT NOT NULL CHECK(length(date) = 10)
);

CREATE INDEX IF NOT EXISTS idx_payments_student_date ON payments(student_id, date);

PRAGMA user_version = 1;
COMMIT;
