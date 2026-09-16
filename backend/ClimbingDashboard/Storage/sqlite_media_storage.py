from __future__ import annotations

import sqlite3
from pathlib import Path

from ClimbingDashboard.Config.constants import ASCENT_VISIBILITY_PUBLIC
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.boulder_media import BoulderMedia
from ClimbingDashboard.Models.stored_media_file import StoredMediaFile
from ClimbingDashboard.Storage.sqlite_connection import connect_sqlite


class SqliteMediaStorage:
    """SQLite-backed storage for boulder media metadata."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)

    def read_boulder_media(
        self,
        name: str,
        area: str,
        sector: str,
        private_user_id: int | None = None,
    ) -> list[BoulderMedia]:
        """Read public media plus the selected user's private media."""

        try:
            with self._connect() as connection:
                problem_id = self._find_boulder_problem_id(connection, name, area, sector)
                if problem_id is None:
                    raise StorageError(
                        f"Boulder problem does not exist: {name} in {area} / {sector}"
                    )
                rows = connection.execute(
                    """
                    SELECT
                        media.id,
                        problems.name,
                        problems.area,
                        problems.sector,
                        media.ascent_id,
                        media.user_id,
                        media.climber,
                        media.media_type,
                        media.file_path,
                        media.original_filename,
                        media.mime_type,
                        media.file_size,
                        media.caption,
                        media.created_at,
                        media.updated_at,
                        COALESCE(ascents.visibility, 'private') AS visibility,
                        COALESCE(NULLIF(users.display_name, ''), media.climber)
                            AS climber_display_name
                    FROM boulder_media AS media
                    INNER JOIN boulder_problems AS problems
                        ON problems.id = media.boulder_id
                    LEFT JOIN ascents
                        ON ascents.id = media.ascent_id
                    LEFT JOIN users
                        ON users.deleted_at IS NULL
                        AND (
                            users.id = media.user_id
                            OR (
                                media.user_id IS NULL
                                AND lower(users.username) = lower(media.climber)
                            )
                        )
                    WHERE media.boulder_id = ?
                        AND media.deleted_at IS NULL
                        AND (
                            ascents.visibility = 'public'
                            OR (? IS NOT NULL AND media.user_id = ?)
                        )
                    ORDER BY media.created_at DESC, media.id DESC
                    """,
                    (problem_id, private_user_id, private_user_id),
                ).fetchall()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read boulder media: {exc}") from exc

        return [self._media_from_row(row) for row in rows]

    def read_recent_boulder_media(
        self,
        limit: int,
        private_user_id: int | None = None,
    ) -> list[BoulderMedia]:
        """Read recent public media plus the selected user's private media."""

        clean_limit = max(1, min(limit, 100))
        try:
            with self._connect() as connection:
                rows = connection.execute(
                    """
                    SELECT
                        media.id,
                        problems.name,
                        problems.area,
                        problems.sector,
                        media.ascent_id,
                        media.user_id,
                        media.climber,
                        media.media_type,
                        media.file_path,
                        media.original_filename,
                        media.mime_type,
                        media.file_size,
                        media.caption,
                        media.created_at,
                        media.updated_at,
                        COALESCE(ascents.visibility, 'private') AS visibility,
                        COALESCE(NULLIF(users.display_name, ''), media.climber)
                            AS climber_display_name
                    FROM boulder_media AS media
                    INNER JOIN boulder_problems AS problems
                        ON problems.id = media.boulder_id
                    LEFT JOIN ascents
                        ON ascents.id = media.ascent_id
                    LEFT JOIN users
                        ON users.deleted_at IS NULL
                        AND (
                            users.id = media.user_id
                            OR (
                                media.user_id IS NULL
                                AND lower(users.username) = lower(media.climber)
                            )
                        )
                    WHERE media.deleted_at IS NULL
                        AND (
                            ascents.visibility = 'public'
                            OR (? IS NOT NULL AND media.user_id = ?)
                        )
                    ORDER BY media.created_at DESC, media.id DESC
                    LIMIT ?
                    """,
                    (private_user_id, private_user_id, clean_limit),
                ).fetchall()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read recent boulder media: {exc}") from exc

        return [self._media_from_row(row) for row in rows]

    def read_boulder_media_by_id(
        self,
        media_id: int,
        private_user_id: int | None = None,
    ) -> BoulderMedia:
        """Read one media item when it is public or owned by the selected user."""

        try:
            with self._connect() as connection:
                media = self._find_media(connection, media_id)
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read boulder media: {exc}") from exc
        if media is None:
            raise StorageError(f"Boulder media does not exist: {media_id}")
        if media.visibility != ASCENT_VISIBILITY_PUBLIC and media.user_id != private_user_id:
            raise PermissionError("You do not have access to this video")
        return media

    def read_profile_media(
        self,
        username: str,
        user_id: int,
        include_private: bool,
    ) -> list[BoulderMedia]:
        """Read one user's public media and private media when viewed by its owner."""

        try:
            with self._connect() as connection:
                rows = connection.execute(
                    """
                    SELECT
                        media.id,
                        problems.name,
                        problems.area,
                        problems.sector,
                        media.ascent_id,
                        media.user_id,
                        media.climber,
                        media.media_type,
                        media.file_path,
                        media.original_filename,
                        media.mime_type,
                        media.file_size,
                        media.caption,
                        media.created_at,
                        media.updated_at,
                        COALESCE(ascents.visibility, 'private') AS visibility,
                        COALESCE(NULLIF(users.display_name, ''), media.climber)
                            AS climber_display_name
                    FROM boulder_media AS media
                    INNER JOIN boulder_problems AS problems
                        ON problems.id = media.boulder_id
                    LEFT JOIN ascents
                        ON ascents.id = media.ascent_id
                    LEFT JOIN users
                        ON users.deleted_at IS NULL
                        AND (
                            users.id = media.user_id
                            OR (
                                media.user_id IS NULL
                                AND lower(users.username) = lower(media.climber)
                            )
                        )
                    WHERE media.deleted_at IS NULL
                        AND (
                            media.user_id = ?
                            OR (
                                media.user_id IS NULL
                                AND lower(media.climber) = lower(?)
                            )
                        )
                        AND (
                            ascents.visibility = 'public'
                            OR (? = 1 AND media.user_id = ?)
                        )
                    ORDER BY media.created_at DESC, media.id DESC
                    """,
                    (user_id, username, 1 if include_private else 0, user_id),
                ).fetchall()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read profile media: {exc}") from exc
        return [self._media_from_row(row) for row in rows]

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

        try:
            with self._connect() as connection:
                problem_id = self._find_boulder_problem_id(connection, name, area, sector)
                if problem_id is None:
                    raise StorageError(
                        f"Boulder problem does not exist: {name} in {area} / {sector}"
                    )
                ascent = self._find_ascent(connection, name, area, sector, climber)
                if ascent is None:
                    raise StorageError("Log this boulder before uploading a video")
                ascent_user_id = ascent["user_id"]
                if ascent_user_id is not None and int(ascent_user_id) != user_id:
                    raise PermissionError("You can only upload videos to your own ascent")
                ascent_id = int(ascent["id"])

                cursor = connection.execute(
                    """
                    INSERT INTO boulder_media (
                        boulder_id,
                        ascent_id,
                        user_id,
                        climber,
                        media_type,
                        file_path,
                        original_filename,
                        mime_type,
                        file_size,
                        caption
                    )
                    VALUES (?, ?, ?, ?, 'video', ?, ?, ?, ?, ?)
                    """,
                    (
                        problem_id,
                        ascent_id,
                        user_id,
                        climber,
                        stored_file.relative_path,
                        stored_file.original_filename,
                        stored_file.mime_type,
                        stored_file.file_size,
                        caption,
                    ),
                )
                media = self._find_media(connection, int(cursor.lastrowid))
                if media is None:
                    raise StorageError("Could not read newly created boulder media")
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to append boulder media: {exc}") from exc

        return media

    def delete_boulder_media(
        self,
        media_id: int,
        climber: str,
        user_id: int,
    ) -> BoulderMedia:
        """Soft-delete one media item owned by the selected user."""

        try:
            with self._connect() as connection:
                media = self._find_media(connection, media_id)
                if media is None:
                    raise StorageError(f"Boulder media does not exist: {media_id}")
                self._ensure_media_owner(media, climber, user_id)
                connection.execute(
                    """
                    UPDATE boulder_media
                    SET
                        deleted_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                        AND deleted_at IS NULL
                    """,
                    (media_id,),
                )
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to delete boulder media: {exc}") from exc

        return media

    def _connect(self) -> sqlite3.Connection:
        return connect_sqlite(self.database_path)

    def _find_boulder_problem_id(
        self,
        connection: sqlite3.Connection,
        name: str,
        area: str,
        sector: str,
    ) -> int | None:
        row = connection.execute(
            """
            SELECT id
            FROM boulder_problems
            WHERE lower(name) = lower(?)
                AND lower(area) = lower(?)
                AND lower(sector) = lower(?)
            """,
            (name, area, sector),
        ).fetchone()
        return None if row is None else int(row["id"])

    def _find_ascent(
        self,
        connection: sqlite3.Connection,
        name: str,
        area: str,
        sector: str,
        climber: str,
    ) -> sqlite3.Row | None:
        return connection.execute(
            """
            SELECT
                ascents.id,
                ascents.boulder_id,
                ascents.user_id
            FROM ascents
            INNER JOIN boulder_problems AS problems
                ON problems.id = ascents.boulder_id
            WHERE lower(problems.name) = lower(?)
                AND lower(problems.area) = lower(?)
                AND lower(problems.sector) = lower(?)
                AND lower(ascents.climber) = lower(?)
            """,
            (name, area, sector, climber),
        ).fetchone()

    def _find_media(
        self,
        connection: sqlite3.Connection,
        media_id: int,
    ) -> BoulderMedia | None:
        row = connection.execute(
            """
            SELECT
                media.id,
                problems.name,
                problems.area,
                problems.sector,
                media.ascent_id,
                media.user_id,
                media.climber,
                media.media_type,
                media.file_path,
                media.original_filename,
                media.mime_type,
                media.file_size,
                media.caption,
                media.created_at,
                media.updated_at,
                COALESCE(ascents.visibility, 'private') AS visibility,
                COALESCE(NULLIF(users.display_name, ''), media.climber)
                    AS climber_display_name
            FROM boulder_media AS media
            INNER JOIN boulder_problems AS problems
                ON problems.id = media.boulder_id
            LEFT JOIN ascents
                ON ascents.id = media.ascent_id
            LEFT JOIN users
                ON users.deleted_at IS NULL
                AND (
                    users.id = media.user_id
                    OR (
                        media.user_id IS NULL
                        AND lower(users.username) = lower(media.climber)
                    )
                )
            WHERE media.id = ?
                AND media.deleted_at IS NULL
            """,
            (media_id,),
        ).fetchone()
        return self._media_from_row(row) if row else None

    def _media_from_row(self, row: sqlite3.Row) -> BoulderMedia:
        ascent_id = row["ascent_id"]
        return BoulderMedia(
            id=int(row["id"]),
            boulder_name=str(row["name"]),
            area=str(row["area"]),
            sector=str(row["sector"]),
            ascent_id=None if ascent_id is None else int(ascent_id),
            climber=str(row["climber"]),
            media_type=str(row["media_type"]),
            file_path=str(row["file_path"]),
            original_filename=str(row["original_filename"]),
            mime_type=str(row["mime_type"]),
            file_size=int(row["file_size"]),
            caption=str(row["caption"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
            user_id=None if row["user_id"] is None else int(row["user_id"]),
            visibility=str(row["visibility"]),
            climber_display_name=str(row["climber_display_name"]),
        )

    def _ensure_media_owner(
        self,
        media: BoulderMedia,
        climber: str,
        user_id: int,
    ) -> None:
        if media.user_id is not None and media.user_id != user_id:
            raise PermissionError("You can only delete your own videos")
        if media.user_id is None and media.climber.lower() != climber.lower():
            raise PermissionError("You can only delete your own videos")
