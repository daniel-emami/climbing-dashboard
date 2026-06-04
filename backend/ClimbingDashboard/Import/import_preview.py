from __future__ import annotations

from dataclasses import dataclass

from ClimbingDashboard.Import.imported_ascent import ImportedAscent


@dataclass(frozen=True)
class ImportPreview:
    """Preview result for imported boulder ascents."""

    source: str
    username: str
    ascents: list[ImportedAscent]
    skipped_count: int

    @property
    def imported_count(self) -> int:
        """Return the number of boulder ascents in this preview."""

        return len(self.ascents)

    def to_payload(self) -> dict[str, object]:
        """Return frontend-ready preview data."""

        return {
            "source": self.source,
            "username": self.username,
            "imported_count": self.imported_count,
            "skipped_count": self.skipped_count,
            "ascents": [ascent.to_payload() for ascent in self.ascents],
        }
