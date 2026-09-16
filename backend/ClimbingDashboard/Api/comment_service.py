from __future__ import annotations

from ClimbingDashboard.Api.api_models import (
    AscentCommentCreateRequest,
    AscentCommentsByAscentPayload,
    AscentCommentsPayload,
    AscentCommentUpdateRequest,
    BoulderCommentCreateRequest,
    BoulderCommentsPayload,
    BoulderCommentUpdateRequest,
)
from ClimbingDashboard.Api.location_candidates import location_candidates
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.ascent_comment import AscentComment
from ClimbingDashboard.Models.boulder_comment import BoulderComment
from ClimbingDashboard.Models.user_account import UserAccount
from ClimbingDashboard.Storage.base_storage import BaseStorage
from ClimbingDashboard.Utilities.location_normalizer import LocationNormalizer


class CommentService:
    def __init__(
        self,
        storage: BaseStorage,
        location_normalizer: LocationNormalizer,
    ) -> None:
        self.storage = storage
        self.location_normalizer = location_normalizer

    def get_boulder_comments(
        self,
        name: str,
        area: str,
        sector: str,
    ) -> BoulderCommentsPayload:
        try:
            comments = self._read_comments_from_first_existing_location(name, area, sector)
        except StorageError as exc:
            raise ApiDataError(f"Could not read boulder comments: {exc}") from exc
        return self._comments_payload(comments)

    def save_boulder_comment(
        self,
        request: BoulderCommentCreateRequest,
        current_user: UserAccount,
    ) -> BoulderCommentsPayload:
        try:
            comments = self._append_comment_to_first_existing_location(
                request.name,
                request.area,
                request.sector,
                current_user.username,
                request.body,
                current_user.id,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not save boulder comment: {exc}") from exc
        return self._comments_payload(comments)

    def update_boulder_comment(
        self,
        comment_id: int,
        request: BoulderCommentUpdateRequest,
        current_user: UserAccount,
    ) -> BoulderCommentsPayload:
        try:
            comment = self.storage.update_boulder_comment(
                comment_id,
                current_user.username,
                request.body,
                current_user.id,
            )
            comments = self.storage.read_boulder_comments(
                comment.boulder_name,
                comment.area,
                comment.sector,
            )
        except PermissionError:
            raise
        except StorageError as exc:
            raise ApiDataError(f"Could not update boulder comment: {exc}") from exc
        return self._comments_payload(comments)

    def delete_boulder_comment(
        self,
        comment_id: int,
        current_user: UserAccount,
    ) -> BoulderCommentsPayload:
        try:
            comment = self.storage.delete_boulder_comment(
                comment_id,
                current_user.username,
                current_user.id,
            )
            comments = self.storage.read_boulder_comments(
                comment.boulder_name,
                comment.area,
                comment.sector,
            )
        except PermissionError:
            raise
        except StorageError as exc:
            raise ApiDataError(f"Could not delete boulder comment: {exc}") from exc
        return self._comments_payload(comments)

    def get_ascent_comments(self, ascent_id: int) -> AscentCommentsPayload:
        try:
            comments = self.storage.read_ascent_comments(ascent_id)
        except StorageError as exc:
            raise ApiDataError(f"Could not read ascent comments: {exc}") from exc
        return self._ascent_comments_payload(comments)

    def get_ascent_comments_for_ascent_ids(
        self,
        ascent_ids: list[int],
    ) -> AscentCommentsByAscentPayload:
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
        current_user: UserAccount,
    ) -> AscentCommentsPayload:
        try:
            self.storage.append_ascent_comment(
                request.ascent_id,
                current_user.username,
                request.body,
                current_user.id,
            )
            comments = self.storage.read_ascent_comments(request.ascent_id)
        except StorageError as exc:
            raise ApiDataError(f"Could not save ascent comment: {exc}") from exc
        return self._ascent_comments_payload(comments)

    def update_ascent_comment(
        self,
        comment_id: int,
        request: AscentCommentUpdateRequest,
        current_user: UserAccount,
    ) -> AscentCommentsPayload:
        try:
            comment = self.storage.update_ascent_comment(
                comment_id,
                current_user.username,
                request.body,
                current_user.id,
            )
            comments = self.storage.read_ascent_comments(comment.ascent_id)
        except PermissionError:
            raise
        except StorageError as exc:
            raise ApiDataError(f"Could not update ascent comment: {exc}") from exc
        return self._ascent_comments_payload(comments)

    def delete_ascent_comment(
        self,
        comment_id: int,
        current_user: UserAccount,
    ) -> AscentCommentsPayload:
        try:
            comment = self.storage.delete_ascent_comment(
                comment_id,
                current_user.username,
                current_user.id,
            )
            comments = self.storage.read_ascent_comments(comment.ascent_id)
        except PermissionError:
            raise
        except StorageError as exc:
            raise ApiDataError(f"Could not delete ascent comment: {exc}") from exc
        return self._ascent_comments_payload(comments)

    def _comments_payload(self, comments: list[BoulderComment]) -> BoulderCommentsPayload:
        return {"comments": [comment.to_payload() for comment in comments]}

    def _ascent_comments_payload(
        self,
        comments: list[AscentComment],
    ) -> AscentCommentsPayload:
        return {"comments": [comment.to_payload() for comment in comments]}

    def _read_comments_from_first_existing_location(
        self,
        name: str,
        area: str,
        sector: str,
    ) -> list[BoulderComment]:
        last_error: StorageError | None = None
        for location in location_candidates(self.location_normalizer, area, sector):
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
        user_id: int | None,
    ) -> list[BoulderComment]:
        last_error: StorageError | None = None
        for location in location_candidates(self.location_normalizer, area, sector):
            try:
                self.storage.append_boulder_comment(
                    name,
                    location.area,
                    location.sector,
                    climber,
                    body,
                    user_id,
                )
                return self.storage.read_boulder_comments(name, location.area, location.sector)
            except StorageError as exc:
                last_error = exc
        raise last_error if last_error is not None else StorageError("Boulder problem not found")
