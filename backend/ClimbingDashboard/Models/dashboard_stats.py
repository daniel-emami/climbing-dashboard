from __future__ import annotations

from dataclasses import dataclass

from ClimbingDashboard.Models.area_grade_matrix_row import AreaGradeMatrixRow


@dataclass(frozen=True)
class AreaCount:
    """Number of climbed boulders in one area."""

    area: str
    count: int

    def to_payload(self) -> dict[str, object]:
        """Return a frontend-friendly area count."""

        return {"area": self.area, "count": self.count}


@dataclass(frozen=True)
class GradeCount:
    """Number of climbed boulders for one grade."""

    grade: str
    count: int

    def to_payload(self) -> dict[str, object]:
        """Return a frontend-friendly grade count."""

        return {"grade": self.grade, "count": self.count}


class DashboardStats:
    """Calculated dashboard statistics for climbed boulders."""

    def __init__(
        self,
        total: int,
        flash_count: int,
        areas: list[AreaCount],
        grade_counts: dict[str, list[GradeCount]],
        area_counts_by_grade_source: dict[str, list[AreaCount]],
        area_grade_matrix_by_grade_source: dict[str, list[AreaGradeMatrixRow]],
        grade_order: tuple[str, ...],
    ) -> None:
        """Create a typed dashboard stats object."""

        self.total = total
        self.flash_count = flash_count
        self.areas = areas
        self.grade_counts = grade_counts
        self.area_counts_by_grade_source = area_counts_by_grade_source
        self.area_grade_matrix_by_grade_source = area_grade_matrix_by_grade_source
        self.grade_order = grade_order

    @property
    def flash_rate(self) -> float:
        """Return the share of climbed boulders that were flashed."""

        return round(self.flash_count / self.total, 3) if self.total else 0

    def to_payload(self) -> dict[str, object]:
        """Return frontend-ready dashboard statistics."""

        return {
            "total": self.total,
            "flash_count": self.flash_count,
            "flash_rate": self.flash_rate,
            "areas": [area.to_payload() for area in self.areas],
            "grade_counts": {
                source: [grade.to_payload() for grade in counts]
                for source, counts in self.grade_counts.items()
            },
            "area_counts_by_grade_source": {
                source: [area.to_payload() for area in counts]
                for source, counts in self.area_counts_by_grade_source.items()
            },
            "area_grade_matrix_by_grade_source": {
                source: [row.to_payload(self.grade_order) for row in rows]
                for source, rows in self.area_grade_matrix_by_grade_source.items()
            },
        }
