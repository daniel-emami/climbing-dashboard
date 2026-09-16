from __future__ import annotations

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
    BoulderMediaPayload,
    BoulderMediaUploadRequest,
    BouldersPayload,
)
from ClimbingDashboard.Api.boulder_service import BoulderService
from ClimbingDashboard.Api.comment_service import CommentService
from ClimbingDashboard.Api.dashboard_stats_service import DashboardStatsService
from ClimbingDashboard.Api.media_service import MediaService
from ClimbingDashboard.Config.constants import (
    DEFAULT_MAX_VIDEO_UPLOAD_BYTES,
)
from ClimbingDashboard.Models.readable_media_file import ReadableMediaFile
from ClimbingDashboard.Models.user_account import UserAccount
from ClimbingDashboard.Storage.base_video_transcoder import BaseVideoTranscoder
from ClimbingDashboard.Storage.local_media_file_storage import LocalMediaFileStorage
from ClimbingDashboard.Storage.sqlite_storage import SqliteStorage
from ClimbingDashboard.Utilities.location_normalizer import LocationNormalizer


class ApiService:
    def __init__(
        self,
        database_path: str | Path,
        location_normalizer: LocationNormalizer | None = None,
        uploads_path: str | Path | None = None,
        max_video_upload_bytes: int = DEFAULT_MAX_VIDEO_UPLOAD_BYTES,
        video_transcoder: BaseVideoTranscoder | None = None,
    ) -> None:
        selected_database_path = Path(database_path)
        self.storage = SqliteStorage(selected_database_path)
        self.media_file_storage = LocalMediaFileStorage(
            uploads_path
            if uploads_path is not None
            else selected_database_path.parent / "uploads",
            max_video_upload_bytes,
            video_transcoder,
        )
        self.location_normalizer = (
            location_normalizer if location_normalizer is not None else LocationNormalizer()
        )
        self.dashboard_stats_service = DashboardStatsService()
        self.boulder_service = BoulderService(
            self.storage,
            self.location_normalizer,
            self.dashboard_stats_service,
        )
        self.comment_service = CommentService(self.storage, self.location_normalizer)
        self.media_service = MediaService(
            self.storage,
            self.media_file_storage,
            self.location_normalizer,
        )

    def get_boulders(self, current_user: UserAccount | None = None) -> BouldersPayload:
        return self.boulder_service.get_boulders(current_user)

    def save_boulder(
        self,
        request: BoulderCreateRequest,
        current_user: UserAccount,
    ) -> BouldersPayload:
        return self.boulder_service.save_boulder(request, current_user)

    def update_boulder(
        self,
        original_name: str,
        original_area: str,
        original_sector: str,
        original_climber: str,
        request: BoulderCreateRequest,
        current_user: UserAccount,
    ) -> BouldersPayload:
        return self.boulder_service.update_boulder(
            original_name,
            original_area,
            original_sector,
            original_climber,
            request,
            current_user,
        )

    def delete_boulder(
        self,
        name: str,
        area: str,
        sector: str,
        climber: str,
        current_user: UserAccount,
    ) -> BouldersPayload:
        return self.boulder_service.delete_boulder(
            name,
            area,
            sector,
            climber,
            current_user,
        )

    def get_boulder_comments(
        self,
        name: str,
        area: str,
        sector: str,
    ) -> BoulderCommentsPayload:
        return self.comment_service.get_boulder_comments(name, area, sector)

    def save_boulder_comment(
        self,
        request: BoulderCommentCreateRequest,
        current_user: UserAccount,
    ) -> BoulderCommentsPayload:
        return self.comment_service.save_boulder_comment(request, current_user)

    def update_boulder_comment(
        self,
        comment_id: int,
        request: BoulderCommentUpdateRequest,
        current_user: UserAccount,
    ) -> BoulderCommentsPayload:
        return self.comment_service.update_boulder_comment(comment_id, request, current_user)

    def delete_boulder_comment(
        self,
        comment_id: int,
        current_user: UserAccount,
    ) -> BoulderCommentsPayload:
        return self.comment_service.delete_boulder_comment(comment_id, current_user)

    def get_ascent_comments(self, ascent_id: int) -> AscentCommentsPayload:
        return self.comment_service.get_ascent_comments(ascent_id)

    def get_ascent_comments_for_ascent_ids(
        self,
        ascent_ids: list[int],
    ) -> AscentCommentsByAscentPayload:
        return self.comment_service.get_ascent_comments_for_ascent_ids(ascent_ids)

    def save_ascent_comment(
        self,
        request: AscentCommentCreateRequest,
        current_user: UserAccount,
    ) -> AscentCommentsPayload:
        return self.comment_service.save_ascent_comment(request, current_user)

    def update_ascent_comment(
        self,
        comment_id: int,
        request: AscentCommentUpdateRequest,
        current_user: UserAccount,
    ) -> AscentCommentsPayload:
        return self.comment_service.update_ascent_comment(comment_id, request, current_user)

    def delete_ascent_comment(
        self,
        comment_id: int,
        current_user: UserAccount,
    ) -> AscentCommentsPayload:
        return self.comment_service.delete_ascent_comment(comment_id, current_user)

    def get_boulder_media(
        self,
        name: str,
        area: str,
        sector: str,
        current_user: UserAccount | None = None,
    ) -> BoulderMediaPayload:
        return self.media_service.get_boulder_media(name, area, sector, current_user)

    def get_recent_boulder_media(
        self,
        limit: int = 30,
        current_user: UserAccount | None = None,
    ) -> BoulderMediaPayload:
        return self.media_service.get_recent_boulder_media(limit, current_user)

    def save_boulder_video(
        self,
        request: BoulderMediaUploadRequest,
        source: BinaryIO,
        original_filename: str,
        mime_type: str | None,
        current_user: UserAccount,
    ) -> BoulderMediaPayload:
        return self.media_service.save_boulder_video(
            request,
            source,
            original_filename,
            mime_type,
            current_user,
        )

    def delete_boulder_media(
        self,
        media_id: int,
        current_user: UserAccount,
    ) -> BoulderMediaPayload:
        return self.media_service.delete_boulder_media(media_id, current_user)

    def get_boulder_video_file(
        self,
        media_id: int,
        current_user: UserAccount | None = None,
    ) -> ReadableMediaFile:
        return self.media_service.get_boulder_video_file(media_id, current_user)
