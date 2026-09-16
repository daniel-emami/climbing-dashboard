from __future__ import annotations

from typing import BinaryIO

from ClimbingDashboard.Api.api_models import BoulderMediaPayload, BoulderMediaUploadRequest
from ClimbingDashboard.Api.location_candidates import location_candidates
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.boulder_media import BoulderMedia
from ClimbingDashboard.Models.readable_media_file import ReadableMediaFile
from ClimbingDashboard.Models.stored_media_file import StoredMediaFile
from ClimbingDashboard.Models.user_account import UserAccount
from ClimbingDashboard.Storage.base_storage import BaseStorage
from ClimbingDashboard.Storage.local_media_file_storage import LocalMediaFileStorage
from ClimbingDashboard.Utilities.location_normalizer import LocationNormalizer


class MediaService:
    def __init__(
        self,
        storage: BaseStorage,
        media_file_storage: LocalMediaFileStorage,
        location_normalizer: LocationNormalizer,
    ) -> None:
        self.storage = storage
        self.media_file_storage = media_file_storage
        self.location_normalizer = location_normalizer

    def get_boulder_media(
        self,
        name: str,
        area: str,
        sector: str,
        current_user: UserAccount | None = None,
    ) -> BoulderMediaPayload:
        try:
            media = self._read_media_from_first_existing_location(
                name,
                area,
                sector,
                current_user.id if current_user is not None else None,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not read boulder media: {exc}") from exc
        return self._media_payload(media)

    def get_recent_boulder_media(
        self,
        limit: int = 30,
        current_user: UserAccount | None = None,
    ) -> BoulderMediaPayload:
        try:
            media = self.storage.read_recent_boulder_media(
                limit,
                current_user.id if current_user is not None else None,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not read recent boulder media: {exc}") from exc
        return self._media_payload(media)

    def save_boulder_video(
        self,
        request: BoulderMediaUploadRequest,
        source: BinaryIO,
        original_filename: str,
        mime_type: str | None,
        current_user: UserAccount,
    ) -> BoulderMediaPayload:
        try:
            stored_file = self.media_file_storage.save_video(
                source,
                original_filename,
                mime_type,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not save video file: {exc}") from exc

        try:
            media = self._append_media_to_first_existing_location(
                request,
                stored_file,
                current_user,
            )
            refreshed_media = self.storage.read_boulder_media(
                media.boulder_name,
                media.area,
                media.sector,
                current_user.id,
            )
        except (PermissionError, StorageError) as exc:
            self.media_file_storage.delete(stored_file.relative_path)
            if isinstance(exc, PermissionError):
                raise
            raise ApiDataError(f"Could not save boulder media: {exc}") from exc
        return self._media_payload(refreshed_media)

    def delete_boulder_media(
        self,
        media_id: int,
        current_user: UserAccount,
    ) -> BoulderMediaPayload:
        try:
            media = self.storage.delete_boulder_media(
                media_id,
                current_user.username,
                current_user.id,
            )
            self.media_file_storage.delete(media.file_path)
            refreshed_media = self.storage.read_boulder_media(
                media.boulder_name,
                media.area,
                media.sector,
                current_user.id,
            )
        except PermissionError:
            raise
        except StorageError as exc:
            raise ApiDataError(f"Could not delete boulder media: {exc}") from exc
        return self._media_payload(refreshed_media)

    def get_boulder_video_file(
        self,
        media_id: int,
        current_user: UserAccount | None = None,
    ) -> ReadableMediaFile:
        try:
            media = self.storage.read_boulder_media_by_id(
                media_id,
                current_user.id if current_user is not None else None,
            )
            return ReadableMediaFile(
                path=self.media_file_storage.readable_path(media.file_path),
                mime_type=media.mime_type,
            )
        except PermissionError:
            raise
        except StorageError as exc:
            raise ApiDataError(f"Could not read video file: {exc}") from exc

    def _media_payload(self, media: list[BoulderMedia]) -> BoulderMediaPayload:
        return {"media": [media_item.to_payload() for media_item in media]}

    def _read_media_from_first_existing_location(
        self,
        name: str,
        area: str,
        sector: str,
        private_user_id: int | None,
    ) -> list[BoulderMedia]:
        last_error: StorageError | None = None
        for location in location_candidates(self.location_normalizer, area, sector):
            try:
                return self.storage.read_boulder_media(
                    name,
                    location.area,
                    location.sector,
                    private_user_id,
                )
            except StorageError as exc:
                last_error = exc
        raise last_error if last_error is not None else StorageError("Boulder problem not found")

    def _append_media_to_first_existing_location(
        self,
        request: BoulderMediaUploadRequest,
        stored_file: StoredMediaFile,
        current_user: UserAccount,
    ) -> BoulderMedia:
        last_error: StorageError | None = None
        for location in location_candidates(
            self.location_normalizer,
            request.area,
            request.sector,
        ):
            try:
                return self.storage.append_boulder_media(
                    request.name,
                    location.area,
                    location.sector,
                    current_user.username,
                    current_user.id,
                    request.caption,
                    stored_file,
                )
            except StorageError as exc:
                last_error = exc
        raise last_error if last_error is not None else StorageError("Boulder problem not found")
