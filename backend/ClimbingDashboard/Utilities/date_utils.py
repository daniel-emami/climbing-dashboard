from __future__ import annotations

from datetime import date, datetime


def parse_climbed_date(value: object) -> date | None:
    """Convert an external date value into a date when possible."""

    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return date.fromisoformat(stripped)
        except ValueError:
            pass
        for date_format in ("%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
            try:
                return datetime.strptime(stripped, date_format).date()
            except ValueError:
                continue
    raise ValueError(f"Could not parse climbed date: {value}")
