from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Utilities.date_utils import parse_excel_date


@dataclass(frozen=True)
class ImportedAscent:
    """One boulder ascent imported from an external source."""

    name: str
    area: str
    grade_27crags: str
    guide_grade: str
    my_grade: str
    flash: bool
    climbed_on: date | None
    ascent_type: str
    source: str
    source_url: str

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> ImportedAscent:
        """Create an imported ascent from frontend preview data."""

        return cls(
            name=cls._text(payload.get("name")),
            area=cls._text(payload.get("area")),
            grade_27crags=cls._text(payload.get("grade_27crags")),
            guide_grade=cls._text(payload.get("guide_grade")),
            my_grade=cls._text(payload.get("my_grade")),
            flash=bool(payload.get("flash", False)),
            climbed_on=parse_excel_date(payload.get("climbed_on")),
            ascent_type=cls._text(payload.get("ascent_type")),
            source=cls._text(payload.get("source")),
            source_url=cls._text(payload.get("source_url")),
        )

    def to_boulder_record(self) -> BoulderRecord:
        """Convert the imported ascent into the app's workbook record."""

        return BoulderRecord(
            name=self.name,
            grade_27crags=self.grade_27crags,
            guide_grade=self.guide_grade,
            my_grade=self.my_grade,
            area=self.area,
            flash=self.flash,
            climbed_on=self.climbed_on,
        )

    def to_payload(self) -> dict[str, object]:
        """Return frontend-ready imported ascent data."""

        return {
            "name": self.name,
            "area": self.area,
            "grade_27crags": self.grade_27crags,
            "guide_grade": self.guide_grade,
            "my_grade": self.my_grade,
            "flash": self.flash,
            "climbed_on": self.climbed_on.isoformat() if self.climbed_on else None,
            "ascent_type": self.ascent_type,
            "source": self.source,
            "source_url": self.source_url,
        }

    @staticmethod
    def _text(value: object) -> str:
        return "" if value is None else str(value).strip()
