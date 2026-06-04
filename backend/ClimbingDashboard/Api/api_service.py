from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path

from ClimbingDashboard.Api.api_models import BoulderCreateRequest, BouldersPayload
from ClimbingDashboard.Api.base_api_service import BaseApiService
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.excel_storage_error import ExcelStorageError
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Storage.excel_storage import ExcelStorage

GRADE_ORDER = (
    "4",
    "4+",
    "5",
    "5+",
    "6a",
    "6a+",
    "6b",
    "6b+",
    "6c",
    "6c+",
    "7a",
    "7a+",
    "7b",
    "7b+",
    "7c",
    "7c+",
    "8a",
    "8a+",
    "8b",
    "8b+",
    "8c",
)


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
            "stats": self._build_stats(records),
            "grade_order": list(GRADE_ORDER),
        }

    def add_boulder(self, request: BoulderCreateRequest) -> BouldersPayload:
        """Append one boulder, then return the refreshed dashboard payload."""

        record = BoulderRecord(
            name=request.name,
            grade_27crags=request.grade_27crags,
            guide_grade=request.guide_grade,
            min_grade=request.min_grade,
            area=request.area,
            flash=request.flash,
            climbed_on=request.climbed_on,
        )
        try:
            self.storage.append_boulder(record)
        except ExcelStorageError as exc:
            raise ApiDataError(f"Could not save boulder: {exc}") from exc
        return self.get_boulders()

    def _read_records(self) -> list[BoulderRecord]:
        try:
            return self.storage.read_boulders()
        except ExcelStorageError as exc:
            raise ApiDataError(f"Could not read boulders: {exc}") from exc

    def _build_stats(self, records: list[BoulderRecord]) -> dict[str, object]:
        by_area = Counter(record.area for record in records if record.area)
        flash_count = sum(1 for record in records if record.flash)
        grade_fields = {
            "grade_27crags": "grade_27crags",
            "guide_grade": "guide_grade",
            "min_grade": "min_grade",
        }
        grade_counts = {
            field_name: self._ordered_counts(
                Counter(
                    getattr(record, attribute)
                    for record in records
                    if getattr(record, attribute)
                )
            )
            for field_name, attribute in grade_fields.items()
        }
        area_grade_matrix = self._area_grade_matrix(records)
        return {
            "total": len(records),
            "flash_count": flash_count,
            "flash_rate": round(flash_count / len(records), 3) if records else 0,
            "areas": [{"area": area, "count": count} for area, count in by_area.most_common()],
            "grade_counts": grade_counts,
            "area_grade_matrix": area_grade_matrix,
        }

    def _ordered_counts(self, counts: Counter[str]) -> list[dict[str, object]]:
        known = [
            {"grade": grade, "count": counts.pop(grade)}
            for grade in GRADE_ORDER
            if counts.get(grade, 0) > 0
        ]
        unknown = [
            {"grade": grade, "count": count}
            for grade, count in sorted(counts.items(), key=lambda item: item[0])
        ]
        return known + unknown

    def _area_grade_matrix(self, records: list[BoulderRecord]) -> list[dict[str, object]]:
        matrix: dict[str, Counter[str]] = defaultdict(Counter)
        for record in records:
            if record.area and record.min_grade:
                matrix[record.area][record.min_grade] += 1

        rows = []
        for area in sorted(matrix):
            row: dict[str, object] = {"area": area}
            row.update({grade: matrix[area].get(grade, 0) for grade in GRADE_ORDER})
            row["total"] = sum(matrix[area].values())
            rows.append(row)
        return sorted(rows, key=lambda row: int(row["total"]), reverse=True)
