from __future__ import annotations

from datetime import date, datetime, timedelta

EXCEL_EPOCH = date(1899, 12, 30)


def parse_excel_date(value: object) -> date | None:
    """Convert an Excel cell value into a date when possible."""

    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, int | float):
        return EXCEL_EPOCH + timedelta(days=int(value))
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


def to_excel_date(value: date | None) -> date | None: # TODO: What the fuck is the purpose for this
    """Return a value openpyxl should store as a date cell."""

    return value
