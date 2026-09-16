from __future__ import annotations

from ClimbingDashboard.Config.constants import (
    ASCENT_VISIBILITY_OPTIONS,
    ASCENT_VISIBILITY_PUBLIC,
)

RATING_ERROR = "rating must be empty or a number from 1 to 5"
VISIBILITY_ERROR = "visibility must be public or private"


def required_text(value: object, field_name: str) -> str:
    """Return stripped text, rejecting empty required fields."""

    text = optional_text(value)
    if not text:
        raise ValueError(f"{field_name} is required")
    return text


def optional_text(value: object) -> str:
    """Return stripped text, treating None as empty."""

    return "" if value is None else str(value).strip()


def payload_bool(value: object) -> bool:
    """Return a permissive boolean for primitive JSON/form values."""

    if isinstance(value, bool):
        return value
    if isinstance(value, int | float):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "flash"}
    return False


def rating(value: object) -> int | None:
    """Return a rating from 1 to 5, or None when empty."""

    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return rating_in_range(int(text))
        except ValueError as exc:
            raise ValueError(RATING_ERROR) from exc
    if isinstance(value, bool):
        raise ValueError(RATING_ERROR)
    if isinstance(value, int):
        return rating_in_range(value)
    if isinstance(value, float) and value.is_integer():
        return rating_in_range(int(value))
    raise ValueError(RATING_ERROR)


def visibility(value: object) -> str:
    """Return a normalized ascent visibility value."""

    parsed_visibility = (
        ASCENT_VISIBILITY_PUBLIC
        if value is None
        else str(value).strip().lower()
    )
    if parsed_visibility not in ASCENT_VISIBILITY_OPTIONS:
        raise ValueError(VISIBILITY_ERROR)
    return parsed_visibility


def rating_in_range(parsed_rating: int) -> int:
    if parsed_rating < 1 or parsed_rating > 5:
        raise ValueError(RATING_ERROR)
    return parsed_rating
