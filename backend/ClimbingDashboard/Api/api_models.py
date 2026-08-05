from __future__ import annotations

from datetime import date
from typing import Any

from ClimbingDashboard.Utilities.date_utils import parse_climbed_date


class BoulderCreateRequest:
    """Validated request object for adding a newly climbed boulder."""

    def __init__(
        self,
        name: str,
        grade_27crags: str | None,
        guide_grade: str | None,
        own_grade: str | None,
        area: str,
        sector: str | None,
        climber: str,
        flash: bool = False,
        climbed_on: date | None = None,
        rating: int | str | None = None,
    ) -> None:
        """Create a request object after primitive payload conversion."""

        self.name = self._required_text(name, "name")
        self.grade_27crags = self._optional_text(grade_27crags)
        self.guide_grade = self._optional_text(guide_grade)
        self.own_grade = self._optional_text(own_grade)
        self.area = self._required_text(area, "area")
        self.sector = self._optional_text(sector)
        self.climber = self._required_text(climber, "climber")
        self.flash = self._bool(flash)
        self.climbed_on = climbed_on
        self.rating = self._rating(rating)

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> BoulderCreateRequest:
        """Build a request object from a JSON-like dictionary."""

        return cls(
            name=payload.get("name", ""),
            grade_27crags=payload.get("grade_27crags", ""),
            guide_grade=payload.get("guide_grade", ""),
            own_grade=payload.get("own_grade", ""),
            area=payload.get("area", ""),
            sector=payload.get("sector", ""),
            climber=payload.get("climber", ""),
            flash=payload.get("flash", False),
            climbed_on=parse_climbed_date(payload.get("climbed_on")),
            rating=payload.get("rating"),
        )

    def to_error_payload(self) -> dict[str, object]:
        """Return the request as simple data, useful for debugging responses."""

        return {
            "name": self.name,
            "grade_27crags": self.grade_27crags,
            "guide_grade": self.guide_grade,
            "own_grade": self.own_grade,
            "area": self.area,
            "sector": self.sector,
            "climber": self.climber,
            "flash": self.flash,
            "climbed_on": self.climbed_on.isoformat() if self.climbed_on else None,
            "rating": self.rating,
        }

    @staticmethod
    def _required_text(value: object, field_name: str) -> str:
        text = "" if value is None else str(value).strip()
        if not text:
            raise ValueError(f"{field_name} is required")
        return text

    @staticmethod
    def _optional_text(value: object) -> str:
        return "" if value is None else str(value).strip()

    @staticmethod
    def _bool(value: object) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, int | float):
            return bool(value)
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "y", "flash"}
        return False

    @staticmethod
    def _rating(value: object) -> int | None:
        if value is None:
            return None
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return None
            try:
                return BoulderCreateRequest._rating_in_range(int(text))
            except ValueError as exc:
                raise ValueError("rating must be empty or a number from 1 to 5") from exc
        if isinstance(value, bool):
            raise ValueError("rating must be empty or a number from 1 to 5")
        if isinstance(value, int):
            return BoulderCreateRequest._rating_in_range(value)
        if isinstance(value, float) and value.is_integer():
            return BoulderCreateRequest._rating_in_range(int(value))
        raise ValueError("rating must be empty or a number from 1 to 5")

    @staticmethod
    def _rating_in_range(rating: int) -> int:
        if rating < 1 or rating > 5:
            raise ValueError("rating must be empty or a number from 1 to 5")
        return rating


type BoulderPayload = dict[str, object]
type BouldersPayload = dict[str, object]


class BoulderCommentCreateRequest:
    """Validated request object for adding a boulder comment."""

    def __init__(
        self,
        name: object,
        area: object,
        sector: object,
        climber: object,
        body: object,
    ) -> None:
        """Create a request object after primitive payload conversion."""

        self.name = BoulderCreateRequest._required_text(name, "name")
        self.area = BoulderCreateRequest._required_text(area, "area")
        self.sector = BoulderCreateRequest._optional_text(sector)
        self.climber = BoulderCreateRequest._required_text(climber, "climber")
        self.body = BoulderCreateRequest._required_text(body, "comment")

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> BoulderCommentCreateRequest:
        """Build a request object from a JSON-like dictionary."""

        return cls(
            name=payload.get("name"),
            area=payload.get("area"),
            sector=payload.get("sector", ""),
            climber=payload.get("climber"),
            body=payload.get("body"),
        )


class BoulderCommentUpdateRequest:
    """Validated request object for editing a boulder comment."""

    def __init__(self, climber: object, body: object) -> None:
        """Create a request object after primitive payload conversion."""

        self.climber = BoulderCreateRequest._required_text(climber, "climber")
        self.body = BoulderCreateRequest._required_text(body, "comment")

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> BoulderCommentUpdateRequest:
        """Build a request object from a JSON-like dictionary."""

        return cls(
            climber=payload.get("climber"),
            body=payload.get("body"),
        )


type BoulderCommentsPayload = dict[str, object]


class AscentCommentCreateRequest:
    """Validated request object for adding an ascent comment."""

    def __init__(self, ascent_id: object, climber: object, body: object) -> None:
        """Create a request object after primitive payload conversion."""

        self.ascent_id = self._required_ascent_id(ascent_id)
        self.climber = BoulderCreateRequest._required_text(climber, "climber")
        self.body = BoulderCreateRequest._required_text(body, "comment")

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> AscentCommentCreateRequest:
        """Build a request object from a JSON-like dictionary."""

        return cls(
            ascent_id=payload.get("ascent_id"),
            climber=payload.get("climber"),
            body=payload.get("body"),
        )

    @staticmethod
    def _required_ascent_id(value: object) -> int:
        if isinstance(value, bool):
            raise ValueError("ascent_id is required")
        try:
            ascent_id = int(str(value).strip())
        except (TypeError, ValueError) as exc:
            raise ValueError("ascent_id is required") from exc
        if ascent_id <= 0:
            raise ValueError("ascent_id is required")
        return ascent_id


class AscentCommentUpdateRequest:
    """Validated request object for editing an ascent comment."""

    def __init__(self, climber: object, body: object) -> None:
        """Create a request object after primitive payload conversion."""

        self.climber = BoulderCreateRequest._required_text(climber, "climber")
        self.body = BoulderCreateRequest._required_text(body, "comment")

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> AscentCommentUpdateRequest:
        """Build a request object from a JSON-like dictionary."""

        return cls(
            climber=payload.get("climber"),
            body=payload.get("body"),
        )


type AscentCommentsPayload = dict[str, object]
type AscentCommentsByAscentPayload = dict[str, object]
