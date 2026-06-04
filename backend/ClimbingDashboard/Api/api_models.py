from __future__ import annotations

from datetime import date
from typing import Any

from ClimbingDashboard.Utilities.date_utils import parse_excel_date


class BoulderCreateRequest:
    """Validated request object for adding a newly climbed boulder."""

    def __init__(
        self,
        name: str,
        grade_27crags: str | None,
        guide_grade: str | None,
        min_grade: str | None,
        area: str,
        flash: bool = False,
        climbed_on: date | None = None,
    ) -> None:
        """Create a request object after primitive payload conversion."""

        self.name = self._required_text(name, "name")
        self.grade_27crags = self._optional_text(grade_27crags)
        self.guide_grade = self._optional_text(guide_grade)
        self.min_grade = self._optional_text(min_grade)
        self.area = self._required_text(area, "area")
        self.flash = self._bool(flash)
        self.climbed_on = climbed_on

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> BoulderCreateRequest:
        """Build a request object from a JSON-like dictionary."""

        return cls(
            name=payload.get("name", ""),
            grade_27crags=payload.get("grade_27crags", ""),
            guide_grade=payload.get("guide_grade", ""),
            min_grade=payload.get("min_grade", ""),
            area=payload.get("area", ""),
            flash=payload.get("flash", False),
            climbed_on=parse_excel_date(payload.get("climbed_on")),
        )

    def to_error_payload(self) -> dict[str, object]:
        """Return the request as simple data, useful for debugging responses."""

        return {
            "name": self.name,
            "grade_27crags": self.grade_27crags,
            "guide_grade": self.guide_grade,
            "min_grade": self.min_grade,
            "area": self.area,
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
