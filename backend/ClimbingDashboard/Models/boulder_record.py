from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from ClimbingDashboard.Config.constants import ASCENT_VISIBILITY_PUBLIC


@dataclass(frozen=True)
class BoulderRecord:
    """One climbed outdoor boulder."""

    name: str
    grade_27crags: str
    guide_grade: str
    own_grade: str
    area: str
    sector: str
    climber: str
    flash: bool
    climbed_on: date | None
    rating: int | None
    visibility: str = ASCENT_VISIBILITY_PUBLIC
    ascent_id: int | None = None
    added_at: str | None = None

    def to_payload(self) -> dict[str, object]:
        """Return a frontend-friendly representation."""

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
            "visibility": self.visibility,
            "ascent_id": self.ascent_id,
            "added_at": self.added_at,
        }
