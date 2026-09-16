from __future__ import annotations

from pathlib import Path

from ClimbingDashboard.Models.ascent_comment import AscentComment
from ClimbingDashboard.Models.boulder_comment import BoulderComment
from ClimbingDashboard.Models.boulder_media import BoulderMedia
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Models.stored_media_file import StoredMediaFile
from ClimbingDashboard.Storage.base_storage import BaseStorage
from ClimbingDashboard.Storage.sqlite_boulder_storage import SqliteBoulderStorage
from ClimbingDashboard.Storage.sqlite_comment_storage import SqliteCommentStorage
from ClimbingDashboard.Storage.sqlite_media_storage import SqliteMediaStorage
from ClimbingDashboard.Storage.sqlite_schema import SqliteSchema


class SqliteStorage(BaseStorage):
    """Facade that composes focused SQLite storage implementations."""

    def __init__(self, database_path: str | Path) -> None:
        """Create storage bound to one SQLite database path."""

        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        SqliteSchema(self.database_path).ensure_schema()
        self.boulder_storage = SqliteBoulderStorage(self.database_path)
        self.comment_storage = SqliteCommentStorage(self.database_path)
        self.media_storage = SqliteMediaStorage(self.database_path)

    def read_boulders(self, private_user_id: int | None = None) -> list[BoulderRecord]:
        """Read all stored ascent records joined with their boulder problem."""

        return self.boulder_storage.read_boulders(private_user_id)

    def append_boulder(
        self,
        record: BoulderRecord,
        user_id: int | None = None,
    ) -> BoulderRecord:
        """Append one boulder record to the database."""

        return self.boulder_storage.append_boulder(record, user_id)

    def append_boulders(
        self,
        records: list[BoulderRecord],
        user_id: int | None = None,
    ) -> list[BoulderRecord]:
        """Append ascent records to the database, skipping duplicates."""

        return self.boulder_storage.append_boulders(records, user_id)

    def update_boulder(
        self,
        original_name: str,
        original_area: str,
        original_sector: str,
        original_climber: str,
        record: BoulderRecord,
        user_id: int | None = None,
    ) -> BoulderRecord:
        """Update one ascent matched by its original boulder identity and climber."""

        return self.boulder_storage.update_boulder(
            original_name,
            original_area,
            original_sector,
            original_climber,
            record,
            user_id,
        )

    def delete_boulder(self, name: str, area: str, sector: str, climber: str) -> None:
        """Delete one ascent matched by boulder identity and climber."""

        self.boulder_storage.delete_boulder(name, area, sector, climber)

    def read_boulder_comments(self, name: str, area: str, sector: str) -> list[BoulderComment]:
        """Read all public comments for one boulder problem."""

        return self.comment_storage.read_boulder_comments(name, area, sector)

    def append_boulder_comment(
        self,
        name: str,
        area: str,
        sector: str,
        climber: str,
        body: str,
        user_id: int | None = None,
    ) -> BoulderComment:
        """Append one public comment to an existing boulder problem."""

        return self.comment_storage.append_boulder_comment(
            name,
            area,
            sector,
            climber,
            body,
            user_id,
        )

    def update_boulder_comment(
        self,
        comment_id: int,
        climber: str,
        body: str,
        user_id: int | None = None,
    ) -> BoulderComment:
        """Update one public boulder comment."""

        return self.comment_storage.update_boulder_comment(comment_id, climber, body, user_id)

    def delete_boulder_comment(
        self,
        comment_id: int,
        climber: str,
        user_id: int | None = None,
    ) -> BoulderComment:
        """Soft-delete one public boulder comment."""

        return self.comment_storage.delete_boulder_comment(comment_id, climber, user_id)

    def read_ascent_comments(self, ascent_id: int) -> list[AscentComment]:
        """Read all public comments for one ascent."""

        return self.comment_storage.read_ascent_comments(ascent_id)

    def read_ascent_comments_for_ascent_ids(
        self,
        ascent_ids: list[int],
    ) -> dict[int, list[AscentComment]]:
        """Read public comments grouped by ascent id."""

        return self.comment_storage.read_ascent_comments_for_ascent_ids(ascent_ids)

    def append_ascent_comment(
        self,
        ascent_id: int,
        climber: str,
        body: str,
        user_id: int | None = None,
    ) -> AscentComment:
        """Append one public comment to an existing ascent."""

        return self.comment_storage.append_ascent_comment(ascent_id, climber, body, user_id)

    def update_ascent_comment(
        self,
        comment_id: int,
        climber: str,
        body: str,
        user_id: int | None = None,
    ) -> AscentComment:
        """Update one public ascent comment."""

        return self.comment_storage.update_ascent_comment(comment_id, climber, body, user_id)

    def delete_ascent_comment(
        self,
        comment_id: int,
        climber: str,
        user_id: int | None = None,
    ) -> AscentComment:
        """Soft-delete one public ascent comment."""

        return self.comment_storage.delete_ascent_comment(comment_id, climber, user_id)

    def read_boulder_media(
        self,
        name: str,
        area: str,
        sector: str,
        private_user_id: int | None = None,
    ) -> list[BoulderMedia]:
        """Read public media plus the selected user's private media."""

        return self.media_storage.read_boulder_media(name, area, sector, private_user_id)

    def read_recent_boulder_media(
        self,
        limit: int,
        private_user_id: int | None = None,
    ) -> list[BoulderMedia]:
        """Read recent public media plus the selected user's private media."""

        return self.media_storage.read_recent_boulder_media(limit, private_user_id)

    def read_boulder_media_by_id(
        self,
        media_id: int,
        private_user_id: int | None = None,
    ) -> BoulderMedia:
        """Read one media item when it is public or owned by the selected user."""

        return self.media_storage.read_boulder_media_by_id(media_id, private_user_id)

    def read_profile_media(
        self,
        username: str,
        user_id: int,
        include_private: bool,
    ) -> list[BoulderMedia]:
        """Read one user's public media and private media when viewed by its owner."""

        return self.media_storage.read_profile_media(username, user_id, include_private)

    def append_boulder_media(
        self,
        name: str,
        area: str,
        sector: str,
        climber: str,
        user_id: int,
        caption: str,
        stored_file: StoredMediaFile,
    ) -> BoulderMedia:
        """Append media linked to the selected user's ascent."""

        return self.media_storage.append_boulder_media(
            name,
            area,
            sector,
            climber,
            user_id,
            caption,
            stored_file,
        )

    def delete_boulder_media(
        self,
        media_id: int,
        climber: str,
        user_id: int,
    ) -> BoulderMedia:
        """Soft-delete one media item owned by the selected user."""

        return self.media_storage.delete_boulder_media(media_id, climber, user_id)
