import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Uzbekistan uses UTC+05:00 without daylight saving time.
TASHKENT = timezone(timedelta(hours=5), name="Asia/Tashkent")


@dataclass(frozen=True)
class Settings:
    database_path: Path

    @classmethod
    def from_env(cls) -> "Settings":
        value = os.environ.get("DATABASE_PATH", str(ROOT / "data" / "payments.sqlite3"))
        return cls(database_path=Path(value).expanduser().resolve())


def local_today():
    return datetime.now(TASHKENT).date()
