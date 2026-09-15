from __future__ import annotations

from pathlib import Path
from typing import BinaryIO

from ClimbingDashboard.Api.profile_models import ProfileUpdateRequest
from ClimbingDashboard.Config.constants import DEFAULT_MAX_PROFILE_PICTURE_BYTES
from ClimbingDashboard.Exceptions.profile_error import ProfileError
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.boulderer_profile import BouldererProfile
from ClimbingDashboard.Models.readable_media_file import ReadableMediaFile
from ClimbingDashboard.Models.user_account import UserAccount
from ClimbingDashboard.Storage.local_profile_picture_storage import (
    LocalProfilePictureStorage,
)
from ClimbingDashboard.Storage.sqlite_auth_storage import SqliteAuthStorage
from ClimbingDashboard.Storage.sqlite_storage import SqliteStorage


class BouldererService:
    """Build and edit boulderer profiles while enforcing ownership and privacy."""

    def __init__(
        self,
        database_path: str | Path,
        uploads_path: str | Path,
        max_profile_picture_bytes: int = DEFAULT_MAX_PROFILE_PICTURE_BYTES,
    ) -> None:
        self.auth_storage = SqliteAuthStorage(database_path)
        self.climbing_storage = SqliteStorage(database_path)
        self.picture_storage = LocalProfilePictureStorage(
            uploads_path,
            max_profile_picture_bytes,
        )

    def get_profile(
        self,
        username: str,
        current_user: UserAccount | None = None,
    ) -> dict[str, object]:
        user = self._read_user(username)
        is_owner = current_user is not None and current_user.id == user.id
        try:
            records = self.climbing_storage.read_boulders(user.id if is_owner else None)
            user_records = [
                record
                for record in records
                if record.climber.lower() == user.username.lower()
            ]
            media = self.climbing_storage.read_profile_media(
                user.username,
                user.id,
                include_private=is_owner,
            )
        except StorageError as exc:
            raise ProfileError(f"Could not load boulderer profile: {exc}", 500) from exc
        return BouldererProfile.build(user, user_records, media, is_owner).to_payload()

    def update_profile(
        self,
        username: str,
        request: ProfileUpdateRequest,
        current_user: UserAccount,
    ) -> dict[str, object]:
        user = self._owned_user(username, current_user)
        try:
            self.auth_storage.update_profile(
                user.id,
                request.display_name,
                user.profile_picture_path,
                user.profile_picture_mime_type,
            )
        except StorageError as exc:
            raise ProfileError(f"Could not update profile: {exc}", 500) from exc
        return self.get_profile(username, current_user)

    def save_profile_picture(
        self,
        username: str,
        source: BinaryIO,
        original_filename: str,
        mime_type: str | None,
        current_user: UserAccount,
    ) -> dict[str, object]:
        user = self._owned_user(username, current_user)
        try:
            stored_picture = self.picture_storage.save(source, original_filename, mime_type)
        except StorageError as exc:
            raise ProfileError(str(exc), 400) from exc
        try:
            self.auth_storage.update_profile(
                user.id,
                user.display_name,
                stored_picture.relative_path,
                stored_picture.mime_type,
            )
        except StorageError as exc:
            self.picture_storage.delete(stored_picture.relative_path)
            raise ProfileError(f"Could not save profile picture: {exc}", 500) from exc
        self.picture_storage.delete(user.profile_picture_path)
        return self.get_profile(username, current_user)

    def get_profile_picture(self, username: str) -> ReadableMediaFile:
        user = self._read_user(username)
        if not user.profile_picture_path or not user.profile_picture_mime_type:
            raise ProfileError("Profile picture does not exist", 404)
        try:
            return ReadableMediaFile(
                path=self.picture_storage.readable_path(user.profile_picture_path),
                mime_type=user.profile_picture_mime_type,
            )
        except StorageError as exc:
            raise ProfileError(str(exc), 404) from exc

    def _owned_user(self, username: str, current_user: UserAccount) -> UserAccount:
        user = self._read_user(username)
        if user.id != current_user.id:
            raise ProfileError("You can only edit your own profile", 403)
        return user

    def _read_user(self, username: str) -> UserAccount:
        try:
            user = self.auth_storage.read_user(username.strip())
        except StorageError as exc:
            raise ProfileError(f"Could not read user: {exc}", 500) from exc
        if user is None:
            raise ProfileError(f"Boulderer does not exist: {username}", 404)
        return user
