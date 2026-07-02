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
        climber: str,
        flash: bool = False,
        climbed_on: date | None = None,
    ) -> None:
        """Create a request object after primitive payload conversion."""

        self.name = self._required_text(name, "name")
        self.grade_27crags = self._optional_text(grade_27crags)
        self.guide_grade = self._optional_text(guide_grade)
        self.own_grade = self._optional_text(own_grade)
        self.area = self._required_text(area, "area")
        self.climber = self._required_text(climber, "climber")
        self.flash = self._bool(flash)
        self.climbed_on = climbed_on

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> BoulderCreateRequest:
        """Build a request object from a JSON-like dictionary."""

        return cls(
            name=payload.get("name", ""),
            grade_27crags=payload.get("grade_27crags", ""),
            guide_grade=payload.get("guide_grade", ""),
            own_grade=payload.get("own_grade", ""),
            area=payload.get("area", ""),
            climber=payload.get("climber", ""),
            flash=payload.get("flash", False),
            climbed_on=parse_climbed_date(payload.get("climbed_on")),
        )

    def to_error_payload(self) -> dict[str, object]:
        """Return the request as simple data, useful for debugging responses."""

        return {
            "name": self.name,
            "grade_27crags": self.grade_27crags,
            "guide_grade": self.guide_grade,
            "own_grade": self.own_grade,
            "area": self.area,
            "climber": self.climber,
            "flash": self.flash,
            "climbed_on": self.climbed_on.isoformat() if self.climbed_on else None,
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


type BoulderPayload = dict[str, object]
type BouldersPayload = dict[str, object]
