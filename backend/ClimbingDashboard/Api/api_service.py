from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path

from ClimbingDashboard.Api.api_models import BoulderCreateRequest, BouldersPayload
from ClimbingDashboard.Api.base_api_service import BaseApiService
from ClimbingDashboard.Config.constants import GRADE_ORDER, GRADE_SOURCE_FIELDS
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.excel_storage_error import ExcelStorageError
from ClimbingDashboard.Models.area_grade_matrix_row import AreaGradeMatrixRow
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Models.dashboard_stats import (
    AreaCount,
    DashboardStats,
    GradeCount,
)
from ClimbingDashboard.Storage.excel_storage import ExcelStorage


class ApiService(BaseApiService):
    """Reads and writes the Excel source, returning frontend-ready payloads."""

    def __init__(self, excel_path: str | Path) -> None:
        """Create the API service for a selected workbook path."""

        self.storage = ExcelStorage(excel_path)

    def get_boulders(self) -> BouldersPayload:
        """Return boulders with calculated stats."""

        records = self._read_records()
        return {
            "records": [record.to_payload() for record in records],
            "stats": self._build_stats(records).to_payload(),
            "grade_order": list(GRADE_ORDER),
        }

    def save_boulder(self, request: BoulderCreateRequest) -> BouldersPayload:
        """Append one boulder, then return the refreshed dashboard payload."""

        record = self._record_from_request(request)
        try:
            self.storage.append_boulder(record)
        except ExcelStorageError as exc:
            raise ApiDataError(f"Could not save boulder: {exc}") from exc
        return self.get_boulders()

    def update_boulder(
        self,
        original_name: str,
        original_area: str,
        request: BoulderCreateRequest,
    ) -> BouldersPayload:
        """Update one boulder, then return the refreshed dashboard payload."""

        record = self._record_from_request(request)
        try:
            self.storage.update_boulder(original_name, original_area, record)
        except ExcelStorageError as exc:
            raise ApiDataError(f"Could not update boulder: {exc}") from exc
        return self.get_boulders()

    def delete_boulder(self, name: str, area: str) -> BouldersPayload:
        """Delete one boulder, then return the refreshed dashboard payload."""

        try:
            self.storage.delete_boulder(name, area)
        except ExcelStorageError as exc:
            raise ApiDataError(f"Could not delete boulder: {exc}") from exc
        return self.get_boulders()

    def _read_records(self) -> list[BoulderRecord]:
        try:
            return self.storage.read_boulders()
        except ExcelStorageError as exc:
            raise ApiDataError(f"Could not read boulders: {exc}") from exc

    def _record_from_request(self, request: BoulderCreateRequest) -> BoulderRecord:
        return BoulderRecord(
            name=request.name,
            grade_27crags=request.grade_27crags,
            guide_grade=request.guide_grade,
            my_grade=request.my_grade,
            area=request.area,
            flash=request.flash,
            climbed_on=request.climbed_on,
        )

    def _build_stats(self, records: list[BoulderRecord]) -> DashboardStats:
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
