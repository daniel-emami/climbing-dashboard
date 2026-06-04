from __future__ import annotations

from collections import Counter


class AreaGradeMatrixRow:
    """Grade counts for one climbing area."""

    def __init__(self, area: str, grade_counts: Counter[str]) -> None:
        """Create a matrix row for one area."""

        self.area = area
        self.grade_counts = grade_counts.copy()

    @property
    def total(self) -> int:
        """Return the total number of counted climbs in this area."""

        return sum(self.grade_counts.values())

    def count_for_grade(self, grade: str) -> int:
        """Return the number of climbs for one grade."""

        return self.grade_counts.get(grade, 0)

    def to_payload(self, grade_order: tuple[str, ...]) -> dict[str, object]:
        """Return a frontend-friendly matrix row."""

        payload: dict[str, object] = {"area": self.area}
        payload.update({grade: self.count_for_grade(grade) for grade in grade_order})
        payload["total"] = self.total
        return payload
