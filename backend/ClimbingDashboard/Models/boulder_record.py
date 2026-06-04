from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class BoulderRecord:
    """One climbed outdoor boulder."""

    name: str
    grade_27crags: str
    guide_grade: str
    my_grade: str
    area: str
    flash: bool
    climbed_on: date | None

    def to_payload(self) -> dict[str, object]:
        """Return a frontend-friendly representation."""

        return {
            "name": self.name,
            "grade_27crags": self.grade_27crags,
            "guide_grade": self.guide_grade,
            "my_grade": self.my_grade,
            "area": self.area,
            "flash": self.flash,
            "climbed_on": self.climbed_on.isoformat() if self.climbed_on else None,
        }
