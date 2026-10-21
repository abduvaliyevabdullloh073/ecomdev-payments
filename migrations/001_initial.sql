CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  phone TEXT NOT NULL CHECK (length(phone) BETWEEN 5 AND 30),
  group_name TEXT NOT NULL CHECK (length(trim(group_name)) BETWEEN 1 AND 80),
  monthly_fee_minor INTEGER NOT NULL CHECK (monthly_fee_minor BETWEEN 0 AND 10000000000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount_minor INTEGER NOT NULL CHECK (amount_minor BETWEEN 1 AND 10000000000),
  date TEXT NOT NULL CHECK (length(date) = 10 AND date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX payments_student_date_idx ON payments(student_id, date);
CREATE INDEX payments_date_idx ON payments(date);
