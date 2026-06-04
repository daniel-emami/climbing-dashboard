from __future__ import annotations

from dataclasses import dataclass

from ClimbingDashboard.Models.boulder_record import BoulderRecord


@dataclass(frozen=True)
class ImportPreview:
    """Preview result for imported boulder ascents."""

    source: str
    username: str
    boulders: list[BoulderRecord]
    skipped_count: int

    @property
    def imported_count(self) -> int:
        """Return the number of boulder ascents in this preview."""

        return len(self.boulders)

    def to_payload(self) -> dict[str, object]:
        """Return frontend-ready preview data."""

        return {
            "source": self.source,
            "username": self.username,
            "imported_count": self.imported_count,
            "skipped_count": self.skipped_count,
            "boulders": [boulder.to_payload() for boulder in self.boulders],
        }
