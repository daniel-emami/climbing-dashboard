from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import BinaryIO

from ClimbingDashboard.Api.api_models import (
    AscentCommentCreateRequest,
    AscentCommentsByAscentPayload,
    AscentCommentsPayload,
    AscentCommentUpdateRequest,
    BoulderCommentCreateRequest,
    BoulderCommentsPayload,
    BoulderCommentUpdateRequest,
    BoulderCreateRequest,
    BoulderMediaByAscentPayload,
    BoulderMediaPayload,
    BoulderMediaUploadRequest,
    BouldersPayload,
)
from ClimbingDashboard.Api.base_api_service import BaseApiService
from ClimbingDashboard.Config.constants import (
    DEFAULT_MAX_VIDEO_UPLOAD_BYTES,
    GRADE_ORDER,
    GRADE_SOURCE_FIELDS,
)
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.area_grade_matrix_row import AreaGradeMatrixRow
from ClimbingDashboard.Models.ascent_comment import AscentComment
from ClimbingDashboard.Models.boulder_comment import BoulderComment
from ClimbingDashboard.Models.boulder_media import BoulderMedia
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Models.dashboard_stats import (
    AreaCount,
    DashboardStats,
    GradeCount,
)
from ClimbingDashboard.Models.stored_media_file import StoredMediaFile
from ClimbingDashboard.Storage.local_media_file_storage import LocalMediaFileStorage
from ClimbingDashboard.Storage.sqlite_storage import SqliteStorage
from ClimbingDashboard.Utilities.location_normalizer import (
    LocationNormalizer,
    NormalizedLocation,
)


class ApiService(BaseApiService):
    """Reads and writes the SQLite source, returning frontend-ready payloads."""

    def __init__(
        self,
        database_path: str | Path,
        location_normalizer: LocationNormalizer | None = None,
        uploads_path: str | Path | None = None,
        max_video_upload_bytes: int = DEFAULT_MAX_VIDEO_UPLOAD_BYTES,
    ) -> None:
        """Create the API service for a selected database path."""

        selected_database_path = Path(database_path)
        self.storage = SqliteStorage(selected_database_path)
        self.media_file_storage = LocalMediaFileStorage(
            uploads_path
            if uploads_path is not None
            else selected_database_path.parent / "uploads",
            max_video_upload_bytes,
        )
        self.location_normalizer = (
            location_normalizer if location_normalizer is not None else LocationNormalizer()
        )

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
        except StorageError as exc:
            raise ApiDataError(f"Could not save boulder: {exc}") from exc
        return self.get_boulders()

    def update_boulder(
        self,
        original_name: str,
        original_area: str,
        original_sector: str,
        original_climber: str,
        request: BoulderCreateRequest,
    ) -> BouldersPayload:
        """Update one boulder, then return the refreshed dashboard payload."""

        record = self._record_from_request(request)
        try:
            self.storage.update_boulder(
                original_name,
                original_area,
                original_sector,
                original_climber,
                record,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not update boulder: {exc}") from exc
        return self.get_boulders()

    def delete_boulder(
        self,
        name: str,
        area: str,
        sector: str,
        climber: str,
    ) -> BouldersPayload:
        """Delete one boulder, then return the refreshed dashboard payload."""

        try:
            self.storage.delete_boulder(name, area, sector, climber)
        except StorageError as exc:
            raise ApiDataError(f"Could not delete boulder: {exc}") from exc
        return self.get_boulders()

    def get_boulder_comments(
        self,
        name: str,
        area: str,
        sector: str,
    ) -> BoulderCommentsPayload:
        """Return public comments for one boulder problem."""

        try:
            comments = self._read_comments_from_first_existing_location(name, area, sector)
        except StorageError as exc:
            raise ApiDataError(f"Could not read boulder comments: {exc}") from exc
        return self._comments_payload(comments)

    def save_boulder_comment(
        self,
        request: BoulderCommentCreateRequest,
    ) -> BoulderCommentsPayload:
        """Append one boulder comment, then return the refreshed comment thread."""

        try:
            comments = self._append_comment_to_first_existing_location(
                request.name,
                request.area,
                request.sector,
                request.climber,
                request.body,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not save boulder comment: {exc}") from exc
        return self._comments_payload(comments)

    def update_boulder_comment(
        self,
        comment_id: int,
        request: BoulderCommentUpdateRequest,
    ) -> BoulderCommentsPayload:
        """Update one boulder comment, then return the refreshed comment thread."""

        try:
            comment = self.storage.update_boulder_comment(
                comment_id,
                request.climber,
                request.body,
            )
            comments = self.storage.read_boulder_comments(
                comment.boulder_name,
                comment.area,
                comment.sector,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not update boulder comment: {exc}") from exc
        return self._comments_payload(comments)

    def delete_boulder_comment(self, comment_id: int) -> BoulderCommentsPayload:
        """Soft-delete one boulder comment, then return the refreshed comment thread."""

        try:
            comment = self.storage.delete_boulder_comment(comment_id)
            comments = self.storage.read_boulder_comments(
                comment.boulder_name,
                comment.area,
                comment.sector,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not delete boulder comment: {exc}") from exc
        return self._comments_payload(comments)

    def get_ascent_comments(self, ascent_id: int) -> AscentCommentsPayload:
        """Return public comments for one ascent."""

        try:
            comments = self.storage.read_ascent_comments(ascent_id)
        except StorageError as exc:
            raise ApiDataError(f"Could not read ascent comments: {exc}") from exc
        return self._ascent_comments_payload(comments)

    def get_ascent_comments_for_ascent_ids(
        self,
        ascent_ids: list[int],
    ) -> AscentCommentsByAscentPayload:
        """Return public comments grouped by ascent id."""

        try:
            comments_by_ascent_id = self.storage.read_ascent_comments_for_ascent_ids(ascent_ids)
        except StorageError as exc:
            raise ApiDataError(f"Could not read ascent comments: {exc}") from exc
        return {
            "comments_by_ascent_id": {
                str(ascent_id): [comment.to_payload() for comment in comments]
                for ascent_id, comments in comments_by_ascent_id.items()
            }
        }

    def save_ascent_comment(
        self,
        request: AscentCommentCreateRequest,
    ) -> AscentCommentsPayload:
        """Append one ascent comment, then return the refreshed comment thread."""

        try:
            self.storage.append_ascent_comment(
                request.ascent_id,
                request.climber,
                request.body,
            )
            comments = self.storage.read_ascent_comments(request.ascent_id)
        except StorageError as exc:
            raise ApiDataError(f"Could not save ascent comment: {exc}") from exc
        return self._ascent_comments_payload(comments)

    def update_ascent_comment(
        self,
        comment_id: int,
        request: AscentCommentUpdateRequest,
    ) -> AscentCommentsPayload:
        """Update one ascent comment, then return the refreshed comment thread."""

        try:
            comment = self.storage.update_ascent_comment(
                comment_id,
                request.climber,
                request.body,
            )
            comments = self.storage.read_ascent_comments(comment.ascent_id)
        except StorageError as exc:
            raise ApiDataError(f"Could not update ascent comment: {exc}") from exc
        return self._ascent_comments_payload(comments)

    def delete_ascent_comment(self, comment_id: int) -> AscentCommentsPayload:
        """Soft-delete one ascent comment, then return the refreshed comment thread."""

        try:
            comment = self.storage.delete_ascent_comment(comment_id)
            comments = self.storage.read_ascent_comments(comment.ascent_id)
        except StorageError as exc:
            raise ApiDataError(f"Could not delete ascent comment: {exc}") from exc
        return self._ascent_comments_payload(comments)

    def get_boulder_media(
        self,
        name: str,
        area: str,
        sector: str,
    ) -> BoulderMediaPayload:
        """Return uploaded media for one boulder problem."""

        try:
            media = self._read_media_from_first_existing_location(name, area, sector)
        except StorageError as exc:
            raise ApiDataError(f"Could not read boulder media: {exc}") from exc
        return self._media_payload(media)

    def get_media_for_ascent_ids(
        self,
        ascent_ids: list[int],
    ) -> BoulderMediaByAscentPayload:
        """Return uploaded media grouped by ascent id."""

        try:
            media_by_ascent_id = self.storage.read_media_for_ascent_ids(ascent_ids)
        except StorageError as exc:
            raise ApiDataError(f"Could not read ascent media: {exc}") from exc
        return {
            "media_by_ascent_id": {
                str(ascent_id): [media.to_payload() for media in media_items]
                for ascent_id, media_items in media_by_ascent_id.items()
            }
        }

    def save_boulder_video(
        self,
        request: BoulderMediaUploadRequest,
        source: BinaryIO,
        original_filename: str,
        mime_type: str | None,
    ) -> BoulderMediaPayload:
        """Save one video file and attach it to a boulder problem."""

        try:
            stored_file = self.media_file_storage.save_video(
                source,
                original_filename,
                mime_type,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not save video file: {exc}") from exc

        try:
            media = self._append_media_to_first_existing_location(request, stored_file)
            refreshed_media = self.storage.read_boulder_media(
                media.boulder_name,
                media.area,
                media.sector,
            )
        except StorageError as exc:
            self.media_file_storage.delete(stored_file.relative_path)
            raise ApiDataError(f"Could not save boulder media: {exc}") from exc
        return self._media_payload(refreshed_media)

    def delete_boulder_media(self, media_id: int) -> BoulderMediaPayload:
        """Soft-delete one media item, remove its file, and return refreshed boulder media."""

        try:
            media = self.storage.delete_boulder_media(media_id)
            self.media_file_storage.delete(media.file_path)
            refreshed_media = self.storage.read_boulder_media(
                media.boulder_name,
                media.area,
                media.sector,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not delete boulder media: {exc}") from exc
        return self._media_payload(refreshed_media)

    def _read_records(self) -> list[BoulderRecord]:
        try:
            return self.storage.read_boulders()
        except StorageError as exc:
            raise ApiDataError(f"Could not read boulders: {exc}") from exc

    def _comments_payload(self, comments: list[BoulderComment]) -> BoulderCommentsPayload:
        return {"comments": [comment.to_payload() for comment in comments]}

    def _ascent_comments_payload(
        self,
        comments: list[AscentComment],
    ) -> AscentCommentsPayload:
        return {"comments": [comment.to_payload() for comment in comments]}

    def _media_payload(self, media: list[BoulderMedia]) -> BoulderMediaPayload:
        return {"media": [media_item.to_payload() for media_item in media]}

    def _record_from_request(self, request: BoulderCreateRequest) -> BoulderRecord:
        record = BoulderRecord(
            name=request.name,
            grade_27crags=request.grade_27crags,
            guide_grade=request.guide_grade,
            own_grade=request.own_grade,
            area=request.area,
            sector=request.sector,
            climber=request.climber,
            flash=request.flash,
            climbed_on=request.climbed_on,
            rating=request.rating,
        )
        return self.location_normalizer.normalize_record(record)

    def _read_comments_from_first_existing_location(
        self,
        name: str,
        area: str,
        sector: str,
    ) -> list[BoulderComment]:
        last_error: StorageError | None = None
        for location in self._location_candidates(area, sector):
            try:
                return self.storage.read_boulder_comments(name, location.area, location.sector)
            except StorageError as exc:
                last_error = exc
        raise last_error if last_error is not None else StorageError("Boulder problem not found")

    def _append_comment_to_first_existing_location(
        self,
        name: str,
        area: str,
        sector: str,
        climber: str,
        body: str,
    ) -> list[BoulderComment]:
        last_error: StorageError | None = None
        for location in self._location_candidates(area, sector):
            try:
                self.storage.append_boulder_comment(
                    name,
                    location.area,
                    location.sector,
                    climber,
                    body,
                )
                return self.storage.read_boulder_comments(name, location.area, location.sector)
            except StorageError as exc:
                last_error = exc
        raise last_error if last_error is not None else StorageError("Boulder problem not found")

    def _read_media_from_first_existing_location(
        self,
        name: str,
        area: str,
        sector: str,
    ) -> list[BoulderMedia]:
        last_error: StorageError | None = None
        for location in self._location_candidates(area, sector):
            try:
                return self.storage.read_boulder_media(name, location.area, location.sector)
            except StorageError as exc:
                last_error = exc
        raise last_error if last_error is not None else StorageError("Boulder problem not found")

    def _append_media_to_first_existing_location(
        self,
        request: BoulderMediaUploadRequest,
        stored_file: StoredMediaFile,
    ) -> BoulderMedia:
        last_error: StorageError | None = None
        for location in self._location_candidates(request.area, request.sector):
            try:
                return self.storage.append_boulder_media(
                    request.name,
                    location.area,
                    location.sector,
                    request.ascent_id,
                    request.climber,
                    request.caption,
                    stored_file,
                )
            except StorageError as exc:
                last_error = exc
        raise last_error if last_error is not None else StorageError("Boulder problem not found")

    def _location_candidates(self, area: str, sector: str) -> list[NormalizedLocation]:
        exact_location = NormalizedLocation(area=area, sector=sector)
        normalized_location = self.location_normalizer.normalize(area, sector)
        if normalized_location == exact_location:
            return [exact_location]
        return [exact_location, normalized_location]

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
