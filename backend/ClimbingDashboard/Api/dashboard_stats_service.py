from __future__ import annotations

from collections import Counter, defaultdict

from ClimbingDashboard.Config.constants import GRADE_ORDER, GRADE_SOURCE_FIELDS
from ClimbingDashboard.Models.area_grade_matrix_row import AreaGradeMatrixRow
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Models.dashboard_stats import (
    AreaCount,
    DashboardStats,
    GradeCount,
)


class DashboardStatsService:
    def build_stats(self, records: list[BoulderRecord]) -> DashboardStats:
        by_area = Counter(record.area for record in records if record.area)
        flash_count = sum(1 for record in records if record.flash)
        grade_counts = {
            field_name: self._ordered_counts(
                Counter(
                    getattr(record, field_name)
                    for record in records
                    if getattr(record, field_name)
                )
            )
            for field_name in GRADE_SOURCE_FIELDS
        }
        return DashboardStats(
            total=len(records),
            flash_count=flash_count,
            areas=[
                AreaCount(area=area, count=count)
                for area, count in by_area.most_common()
            ],
            grade_counts=grade_counts,
            area_counts_by_grade_source={
                field_name: self._area_counts(records, field_name)
                for field_name in GRADE_SOURCE_FIELDS
            },
            area_grade_matrix_by_grade_source={
                field_name: self._area_grade_matrix(records, field_name)
                for field_name in GRADE_SOURCE_FIELDS
            },
            grade_order=GRADE_ORDER,
        )

    def _ordered_counts(self, counts: Counter[str]) -> list[GradeCount]:
        known = [
            GradeCount(grade=grade, count=counts.pop(grade))
            for grade in GRADE_ORDER
            if counts.get(grade, 0) > 0
        ]
        unknown = [
            GradeCount(grade=grade, count=count)
            for grade, count in sorted(counts.items(), key=lambda item: item[0])
        ]
        return known + unknown

    def _area_counts(
        self,
        records: list[BoulderRecord],
        grade_attribute: str,
    ) -> list[AreaCount]:
        counts = Counter(
            record.area
            for record in records
            if record.area and getattr(record, grade_attribute)
        )
        return [
            AreaCount(area=area, count=count) for area, count in counts.most_common()
        ]

    def _area_grade_matrix(
        self,
        records: list[BoulderRecord],
        grade_attribute: str,
    ) -> list[AreaGradeMatrixRow]:
        matrix: dict[str, Counter[str]] = defaultdict(Counter)
        for record in records:
            grade = getattr(record, grade_attribute)
            if record.area and grade:
                matrix[record.area][grade] += 1

        rows = [
            AreaGradeMatrixRow(area=area, grade_counts=grade_counts)
            for area, grade_counts in matrix.items()
        ]
        return sorted(rows, key=lambda row: row.total, reverse=True)
