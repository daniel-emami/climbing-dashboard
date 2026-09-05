from __future__ import annotations

import logging
import sqlite3
from pathlib import Path

from ClimbingDashboard.Config.constants import ASCENT_VISIBILITY_PUBLIC
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.ascent_comment import AscentComment
from ClimbingDashboard.Models.boulder_comment import BoulderComment
from ClimbingDashboard.Models.boulder_media import BoulderMedia
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Models.stored_media_file import StoredMediaFile
from ClimbingDashboard.Storage.base_storage import BaseStorage
from ClimbingDashboard.Storage.sqlite_user_schema import ensure_users_schema
from ClimbingDashboard.Utilities.date_utils import parse_climbed_date

logger = logging.getLogger(__name__)


class SqliteStorage(BaseStorage):
    """SQLite storage implementation for boulder problems and ascents."""

    def __init__(self, database_path: str | Path) -> None:
        """Create storage bound to one SQLite database path."""

        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._create_schema()

    def read_boulders(self, private_user_id: int | None = None) -> list[BoulderRecord]:
        """Read all stored ascent records joined with their boulder problem."""

        try:
            with self._connect() as connection:
                rows = connection.execute(
                    """
                    SELECT
                        ascents.id,
                        problems.name,
                        problems.area,
                        problems.sector,
                        ascents.grade_27crags,
                        ascents.guide_grade,
                        ascents.own_grade,
                        ascents.climber,
                        ascents.flash,
                        ascents.climbed_on,
                        ascents.rating,
                        ascents.visibility,
                        ascents.created_at,
                        COALESCE(NULLIF(users.display_name, ''), ascents.climber)
                            AS climber_display_name
                    FROM ascents
                    INNER JOIN boulder_problems AS problems
                        ON problems.id = ascents.boulder_id
                    LEFT JOIN users
                        ON users.deleted_at IS NULL
                        AND (
                            users.id = ascents.user_id
                            OR (
                                ascents.user_id IS NULL
                                AND lower(users.username) = lower(ascents.climber)
                            )
                        )
                    WHERE ascents.visibility = 'public'
                        OR (? IS NOT NULL AND ascents.user_id = ?)
                    ORDER BY ascents.id
                    """,
                    (private_user_id, private_user_id),
                ).fetchall()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read ascents: {exc}") from exc

        return [
            BoulderRecord(
                name=str(row["name"]),
                grade_27crags=str(row["grade_27crags"]),
                guide_grade=str(row["guide_grade"]),
                own_grade=str(row["own_grade"]),
                area=str(row["area"]),
                sector=str(row["sector"]),
                climber=str(row["climber"]),
                flash=bool(row["flash"]),
                climbed_on=parse_climbed_date(row["climbed_on"]),
                rating=None if row["rating"] is None else int(row["rating"]),
                visibility=str(row["visibility"]),
                ascent_id=int(row["id"]),
                added_at=str(row["created_at"]),
                climber_display_name=str(row["climber_display_name"]),
            )
            for row in rows
        ]

    def append_boulder(
        self,
        record: BoulderRecord,
        user_id: int | None = None,
    ) -> BoulderRecord:
        """Append one boulder record to the database."""

        self.append_boulders([record], user_id)
        return record

    def append_boulders(
        self,
        records: list[BoulderRecord],
        user_id: int | None = None,
    ) -> list[BoulderRecord]:
        """Append ascent records to the database, skipping duplicates."""

        appended_records: list[BoulderRecord] = []
        try:
            with self._connect() as connection:
                for record in records:
                    problem_id = self._ensure_boulder_problem(
                        connection,
                        record.name,
                        record.area,
                        record.sector,
                    )
                    cursor = connection.execute(
                        """
                        INSERT OR IGNORE INTO ascents (
                            boulder_id,
                            user_id,
                            climber,
                            grade_27crags,
                            guide_grade,
                            own_grade,
                            flash,
                            climbed_on,
                            rating,
                            visibility
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (problem_id, user_id, *self._ascent_values(record)),
                    )
                    if cursor.rowcount > 0:
                        appended_records.append(record)
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to append ascents: {exc}") from exc

        logger.info("Appended %s ascents to %s", len(appended_records), self.database_path)
        return appended_records

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

        try:
            with self._connect() as connection:
                target = self._find_ascent(
                    connection,
                    original_name,
                    original_area,
                    original_sector,
                    original_climber,
                )
                if target is None:
                    raise StorageError(
                        "Boulder does not exist: "
                        f"{original_name} in {original_area} / {original_sector} "
                        f"for {original_climber}"
                    )

                old_problem_id = int(target["boulder_id"])
                new_problem_id = self._ensure_boulder_problem(
                    connection,
                    record.name,
                    record.area,
                    record.sector,
                )
                connection.execute(
                    """
                    UPDATE ascents
                    SET
                        boulder_id = ?,
                        user_id = ?,
                        climber = ?,
                        grade_27crags = ?,
                        guide_grade = ?,
                        own_grade = ?,
                        flash = ?,
                        climbed_on = ?,
                        rating = ?,
                        visibility = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (new_problem_id, user_id, *self._ascent_values(record), int(target["id"])),
                )
                if old_problem_id != new_problem_id:
                    self._delete_unused_problem(connection, old_problem_id)
        except sqlite3.IntegrityError as exc:
            raise StorageError(
                "Cannot update boulder. The key already exists: "
                f"{record.name} in {record.area} / {record.sector} for {record.climber}"
            ) from exc
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to update boulder: {exc}") from exc

        return record

    def delete_boulder(self, name: str, area: str, sector: str, climber: str) -> None:
        """Delete one ascent matched by boulder identity and climber."""

        try:
            with self._connect() as connection:
                target = self._find_ascent(connection, name, area, sector, climber)
                if target is None:
                    raise StorageError(
                        f"Boulder does not exist: {name} in {area} / {sector} for {climber}"
                    )
                connection.execute(
                    """
                    DELETE FROM ascents
                    WHERE id = ?
                    """,
                    (int(target["id"]),),
                )
                self._delete_unused_problem(connection, int(target["boulder_id"]))
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to delete boulder: {exc}") from exc

    def read_boulder_comments(self, name: str, area: str, sector: str) -> list[BoulderComment]:
        """Read all public comments for one boulder problem."""

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
                        comments.id,
                        problems.name,
                        problems.area,
                        problems.sector,
                        comments.user_id,
                        comments.climber,
                        comments.body,
                        comments.created_at,
                        comments.updated_at,
                        COALESCE(NULLIF(users.display_name, ''), comments.climber)
                            AS climber_display_name
                    FROM boulder_comments AS comments
                    INNER JOIN boulder_problems AS problems
                        ON problems.id = comments.boulder_id
                    LEFT JOIN users
                        ON users.deleted_at IS NULL
                        AND (
                            users.id = comments.user_id
                            OR (
                                comments.user_id IS NULL
                                AND lower(users.username) = lower(comments.climber)
                            )
                        )
                    WHERE comments.boulder_id = ?
                        AND comments.deleted_at IS NULL
                    ORDER BY comments.created_at DESC, comments.id DESC
                    """,
                    (problem_id,),
                ).fetchall()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read boulder comments: {exc}") from exc

        return [self._comment_from_row(row) for row in rows]

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

        try:
            with self._connect() as connection:
                problem_id = self._find_boulder_problem_id(connection, name, area, sector)
                if problem_id is None:
                    raise StorageError(
                        f"Boulder problem does not exist: {name} in {area} / {sector}"
                    )
                cursor = connection.execute(
                    """
                    INSERT INTO boulder_comments (boulder_id, user_id, climber, body)
                    VALUES (?, ?, ?, ?)
                    """,
                    (problem_id, user_id, climber, body),
                )
                comment = self._find_comment(connection, int(cursor.lastrowid))
                if comment is None:
                    raise StorageError("Could not read newly created boulder comment")
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to append boulder comment: {exc}") from exc

        return comment

    def update_boulder_comment(
        self,
        comment_id: int,
        climber: str,
        body: str,
        user_id: int | None = None,
    ) -> BoulderComment:
        """Update one public boulder comment."""

        try:
            with self._connect() as connection:
                existing = self._find_comment(connection, comment_id)
                if existing is None:
                    raise StorageError(f"Boulder comment does not exist: {comment_id}")
                self._ensure_comment_owner(existing, climber, user_id)
                connection.execute(
                    """
                    UPDATE boulder_comments
                    SET
                        user_id = ?,
                        climber = ?,
                        body = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                        AND deleted_at IS NULL
                    """,
                    (user_id, climber, body, comment_id),
                )
                comment = self._find_comment(connection, comment_id)
                if comment is None:
                    raise StorageError(f"Boulder comment does not exist: {comment_id}")
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to update boulder comment: {exc}") from exc

        return comment

    def delete_boulder_comment(
        self,
        comment_id: int,
        climber: str,
        user_id: int | None = None,
    ) -> BoulderComment:
        """Soft-delete one public boulder comment."""

        try:
            with self._connect() as connection:
                comment = self._find_comment(connection, comment_id)
                if comment is None:
                    raise StorageError(f"Boulder comment does not exist: {comment_id}")
                self._ensure_comment_owner(comment, climber, user_id)
                connection.execute(
                    """
                    UPDATE boulder_comments
                    SET
                        deleted_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                        AND deleted_at IS NULL
                    """,
                    (comment_id,),
                )
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to delete boulder comment: {exc}") from exc

        return comment

    def read_ascent_comments(self, ascent_id: int) -> list[AscentComment]:
        """Read all public comments for one ascent."""

        try:
            with self._connect() as connection:
                if not self._ascent_exists(connection, ascent_id):
                    raise StorageError(f"Ascent does not exist: {ascent_id}")
                rows = connection.execute(
                    """
                    SELECT
                        ascent_comments.id,
                        ascent_comments.ascent_id,
                        ascent_comments.user_id,
                        ascent_comments.climber,
                        ascent_comments.body,
                        ascent_comments.created_at,
                        ascent_comments.updated_at,
                        COALESCE(NULLIF(users.display_name, ''), ascent_comments.climber)
                            AS climber_display_name
                    FROM ascent_comments
                    LEFT JOIN users
                        ON users.deleted_at IS NULL
                        AND (
                            users.id = ascent_comments.user_id
                            OR (
                                ascent_comments.user_id IS NULL
                                AND lower(users.username) = lower(ascent_comments.climber)
                            )
                        )
                    WHERE ascent_comments.ascent_id = ?
                        AND ascent_comments.deleted_at IS NULL
                    ORDER BY ascent_comments.created_at ASC, ascent_comments.id ASC
                    """,
                    (ascent_id,),
                ).fetchall()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read ascent comments: {exc}") from exc

        return [self._ascent_comment_from_row(row) for row in rows]

    def read_ascent_comments_for_ascent_ids(
        self,
        ascent_ids: list[int],
    ) -> dict[int, list[AscentComment]]:
        """Read public comments grouped by ascent id."""

        clean_ascent_ids = sorted({ascent_id for ascent_id in ascent_ids if ascent_id > 0})
        comments_by_ascent_id: dict[int, list[AscentComment]] = {
            ascent_id: [] for ascent_id in clean_ascent_ids
        }
        if not clean_ascent_ids:
            return comments_by_ascent_id

        placeholders = ",".join("?" for _ in clean_ascent_ids)
        try:
            with self._connect() as connection:
                rows = connection.execute(
                    f"""
                    SELECT
                        ascent_comments.id,
                        ascent_comments.ascent_id,
                        ascent_comments.user_id,
                        ascent_comments.climber,
                        ascent_comments.body,
                        ascent_comments.created_at,
                        ascent_comments.updated_at,
                        COALESCE(NULLIF(users.display_name, ''), ascent_comments.climber)
                            AS climber_display_name
                    FROM ascent_comments
                    LEFT JOIN users
                        ON users.deleted_at IS NULL
                        AND (
                            users.id = ascent_comments.user_id
                            OR (
                                ascent_comments.user_id IS NULL
                                AND lower(users.username) = lower(ascent_comments.climber)
                            )
                        )
                    WHERE ascent_comments.ascent_id IN ({placeholders})
                        AND ascent_comments.deleted_at IS NULL
                    ORDER BY ascent_comments.ascent_id,
                        ascent_comments.created_at ASC,
                        ascent_comments.id ASC
                    """,
                    clean_ascent_ids,
                ).fetchall()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read ascent comments: {exc}") from exc

        for row in rows:
            comment = self._ascent_comment_from_row(row)
            comments_by_ascent_id.setdefault(comment.ascent_id, []).append(comment)
        return comments_by_ascent_id

    def append_ascent_comment(
        self,
        ascent_id: int,
        climber: str,
        body: str,
        user_id: int | None = None,
    ) -> AscentComment:
        """Append one public comment to an existing ascent."""

        try:
            with self._connect() as connection:
                if not self._ascent_exists(connection, ascent_id):
                    raise StorageError(f"Ascent does not exist: {ascent_id}")
                cursor = connection.execute(
                    """
                    INSERT INTO ascent_comments (ascent_id, user_id, climber, body)
                    VALUES (?, ?, ?, ?)
                    """,
                    (ascent_id, user_id, climber, body),
                )
                comment = self._find_ascent_comment(connection, int(cursor.lastrowid))
                if comment is None:
                    raise StorageError("Could not read newly created ascent comment")
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to append ascent comment: {exc}") from exc

        return comment

    def update_ascent_comment(
        self,
        comment_id: int,
        climber: str,
        body: str,
        user_id: int | None = None,
    ) -> AscentComment:
        """Update one public ascent comment."""

        try:
            with self._connect() as connection:
                existing = self._find_ascent_comment(connection, comment_id)
                if existing is None:
                    raise StorageError(f"Ascent comment does not exist: {comment_id}")
                self._ensure_ascent_comment_owner(existing, climber, user_id)
                connection.execute(
                    """
                    UPDATE ascent_comments
                    SET
                        user_id = ?,
                        climber = ?,
                        body = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                        AND deleted_at IS NULL
                    """,
                    (user_id, climber, body, comment_id),
                )
                comment = self._find_ascent_comment(connection, comment_id)
                if comment is None:
                    raise StorageError(f"Ascent comment does not exist: {comment_id}")
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to update ascent comment: {exc}") from exc

        return comment

    def delete_ascent_comment(
        self,
        comment_id: int,
        climber: str,
        user_id: int | None = None,
    ) -> AscentComment:
        """Soft-delete one public ascent comment."""

        try:
            with self._connect() as connection:
                comment = self._find_ascent_comment(connection, comment_id)
                if comment is None:
                    raise StorageError(f"Ascent comment does not exist: {comment_id}")
                self._ensure_ascent_comment_owner(comment, climber, user_id)
                connection.execute(
                    """
                    UPDATE ascent_comments
                    SET
                        deleted_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                        AND deleted_at IS NULL
                    """,
                    (comment_id,),
                )
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to delete ascent comment: {exc}") from exc

        return comment

    def read_boulder_media(self, name: str, area: str, sector: str) -> list[BoulderMedia]:
        """Read all public media for one boulder problem."""

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
                        media.climber,
                        media.media_type,
                        media.file_path,
                        media.original_filename,
                        media.mime_type,
                        media.file_size,
                        media.caption,
                        media.created_at,
                        media.updated_at,
                        COALESCE(NULLIF(users.display_name, ''), media.climber)
                            AS climber_display_name
                    FROM boulder_media AS media
                    INNER JOIN boulder_problems AS problems
                        ON problems.id = media.boulder_id
                    LEFT JOIN users
                        ON users.deleted_at IS NULL
                        AND lower(users.username) = lower(media.climber)
                    WHERE media.boulder_id = ?
                        AND media.deleted_at IS NULL
                    ORDER BY media.created_at DESC, media.id DESC
                    """,
                    (problem_id,),
                ).fetchall()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read boulder media: {exc}") from exc

        return [self._media_from_row(row) for row in rows]

    def read_recent_boulder_media(self, limit: int) -> list[BoulderMedia]:
        """Read recent public media across all boulder problems."""

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
                        media.climber,
                        media.media_type,
                        media.file_path,
                        media.original_filename,
                        media.mime_type,
                        media.file_size,
                        media.caption,
                        media.created_at,
                        media.updated_at,
                        COALESCE(NULLIF(users.display_name, ''), media.climber)
                            AS climber_display_name
                    FROM boulder_media AS media
                    INNER JOIN boulder_problems AS problems
                        ON problems.id = media.boulder_id
                    LEFT JOIN users
                        ON users.deleted_at IS NULL
                        AND lower(users.username) = lower(media.climber)
                    WHERE media.deleted_at IS NULL
                    ORDER BY media.created_at DESC, media.id DESC
                    LIMIT ?
                    """,
                    (clean_limit,),
                ).fetchall()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read recent boulder media: {exc}") from exc

        return [self._media_from_row(row) for row in rows]

    def append_boulder_media(
        self,
        name: str,
        area: str,
        sector: str,
        ascent_id: int | None,
        climber: str,
        caption: str,
        stored_file: StoredMediaFile,
    ) -> BoulderMedia:
        """Append one uploaded media record to an existing boulder problem."""

        try:
            with self._connect() as connection:
                problem_id = self._find_boulder_problem_id(connection, name, area, sector)
                if problem_id is None:
                    raise StorageError(
                        f"Boulder problem does not exist: {name} in {area} / {sector}"
                    )
                if ascent_id is not None:
                    ascent_boulder_id = self._ascent_boulder_id(connection, ascent_id)
                    if ascent_boulder_id is None:
                        raise StorageError(f"Ascent does not exist: {ascent_id}")
                    if ascent_boulder_id != problem_id:
                        raise StorageError("Ascent does not belong to this boulder problem")

                cursor = connection.execute(
                    """
                    INSERT INTO boulder_media (
                        boulder_id,
                        ascent_id,
                        climber,
                        media_type,
                        file_path,
                        original_filename,
                        mime_type,
                        file_size,
                        caption
                    )
                    VALUES (?, ?, ?, 'video', ?, ?, ?, ?, ?)
                    """,
                    (
                        problem_id,
                        ascent_id,
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

    def delete_boulder_media(self, media_id: int) -> BoulderMedia:
        """Soft-delete one public media item."""

        try:
            with self._connect() as connection:
                media = self._find_media(connection, media_id)
                if media is None:
                    raise StorageError(f"Boulder media does not exist: {media_id}")
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
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _create_schema(self) -> None:
        try:
            with self._connect() as connection:
                self._create_normalized_tables(connection)
                self._migrate_normalized_columns(connection)
                self._migrate_legacy_boulders_table(connection)
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to create SQLite schema: {exc}") from exc

    def _create_normalized_tables(self, connection: sqlite3.Connection) -> None:
        ensure_users_schema(connection)
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS boulder_problems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                area TEXT NOT NULL,
                sector TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self._migrate_boulder_problem_columns(connection)
        self._ensure_boulder_problem_unique_index(connection)
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ascents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                boulder_id INTEGER NOT NULL,
                user_id INTEGER,
                climber TEXT NOT NULL DEFAULT '',
                grade_27crags TEXT NOT NULL DEFAULT '',
                guide_grade TEXT NOT NULL DEFAULT '',
                own_grade TEXT NOT NULL DEFAULT '',
                flash INTEGER NOT NULL DEFAULT 0,
                climbed_on TEXT,
                rating INTEGER,
                visibility TEXT NOT NULL DEFAULT 'public',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (boulder_id)
                    REFERENCES boulder_problems(id)
                    ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ascents_unique_key
            ON ascents (boulder_id, lower(climber))
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS boulder_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                boulder_id INTEGER NOT NULL,
                user_id INTEGER,
                climber TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT,
                FOREIGN KEY (boulder_id)
                    REFERENCES boulder_problems(id)
                    ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS boulder_comments_boulder_id_idx
            ON boulder_comments (boulder_id, created_at)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ascent_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ascent_id INTEGER NOT NULL,
                user_id INTEGER,
                climber TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT,
                FOREIGN KEY (ascent_id)
                    REFERENCES ascents(id)
                    ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS ascent_comments_ascent_id_idx
            ON ascent_comments (ascent_id, created_at)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS boulder_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                boulder_id INTEGER NOT NULL,
                ascent_id INTEGER,
                climber TEXT NOT NULL,
                media_type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                caption TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT,
                FOREIGN KEY (boulder_id)
                    REFERENCES boulder_problems(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (ascent_id)
                    REFERENCES ascents(id)
                    ON DELETE SET NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS boulder_media_boulder_id_idx
            ON boulder_media (boulder_id, created_at)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS boulder_media_ascent_id_idx
            ON boulder_media (ascent_id, created_at)
            """
        )

    def _migrate_normalized_columns(self, connection: sqlite3.Connection) -> None:
        ascent_columns = self._column_names(connection, "ascents")
        if "user_id" not in ascent_columns:
            connection.execute("ALTER TABLE ascents ADD COLUMN user_id INTEGER")
        if "visibility" not in ascent_columns:
            connection.execute(
                "ALTER TABLE ascents ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'"
            )

        comment_columns = self._column_names(connection, "boulder_comments")
        if "user_id" not in comment_columns:
            connection.execute("ALTER TABLE boulder_comments ADD COLUMN user_id INTEGER")

        ascent_comment_columns = self._column_names(connection, "ascent_comments")
        if "user_id" not in ascent_comment_columns:
            connection.execute("ALTER TABLE ascent_comments ADD COLUMN user_id INTEGER")

    def _migrate_legacy_boulders_table(self, connection: sqlite3.Connection) -> None:
        if not self._table_exists(connection, "boulders"):
            return

        self._migrate_legacy_boulder_columns(connection)
        rows = connection.execute(
            """
            SELECT
                id,
                name,
                area,
                sector,
                climber,
                grade_27crags,
                guide_grade,
                own_grade,
                flash,
                climbed_on,
                rating,
                created_at,
                updated_at
            FROM boulders
            ORDER BY id
            """
        ).fetchall()
        for row in rows:
            problem_id = self._ensure_boulder_problem(
                connection,
                str(row["name"]),
                str(row["area"]),
                str(row["sector"]),
            )
            connection.execute(
                """
                INSERT OR IGNORE INTO ascents (
                    boulder_id,
                    user_id,
                    climber,
                    grade_27crags,
                    guide_grade,
                    own_grade,
                    flash,
                    climbed_on,
                    rating,
                    visibility,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    COALESCE(?, CURRENT_TIMESTAMP),
                    COALESCE(?, CURRENT_TIMESTAMP)
                )
                """,
                (
                    problem_id,
                    None,
                    str(row["climber"]),
                    str(row["grade_27crags"]),
                    str(row["guide_grade"]),
                    str(row["own_grade"]),
                    1 if row["flash"] else 0,
                    row["climbed_on"],
                    row["rating"],
                    ASCENT_VISIBILITY_PUBLIC,
                    row["created_at"],
                    row["updated_at"],
                ),
            )

        connection.execute("DROP TABLE boulders")
        connection.execute("DROP INDEX IF EXISTS boulders_unique_key")

    def _migrate_legacy_boulder_columns(self, connection: sqlite3.Connection) -> None:
        columns = self._column_names(connection, "boulders")
        if "my_grade" in columns and "own_grade" not in columns:
            connection.execute("ALTER TABLE boulders RENAME COLUMN my_grade TO own_grade")
            columns = self._column_names(connection, "boulders")
        if "sector" not in columns:
            connection.execute("ALTER TABLE boulders ADD COLUMN sector TEXT NOT NULL DEFAULT ''")
            columns = self._column_names(connection, "boulders")
        if "rating" not in columns:
            connection.execute("ALTER TABLE boulders ADD COLUMN rating INTEGER")

    def _migrate_boulder_problem_columns(self, connection: sqlite3.Connection) -> None:
        columns = self._column_names(connection, "boulder_problems")
        if "sector" not in columns:
            connection.execute(
                "ALTER TABLE boulder_problems ADD COLUMN sector TEXT NOT NULL DEFAULT ''"
            )

    def _ensure_boulder_problem_unique_index(self, connection: sqlite3.Connection) -> None:
        row = connection.execute(
            """
            SELECT sql
            FROM sqlite_master
            WHERE type = 'index'
                AND name = 'boulder_problems_unique_key'
            """
        ).fetchone()
        index_sql = "" if row is None else str(row["sql"])
        if "lower(sector)" not in index_sql:
            connection.execute("DROP INDEX IF EXISTS boulder_problems_unique_key")

        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS boulder_problems_unique_key
            ON boulder_problems (lower(name), lower(area), lower(sector))
            """
        )

    def _table_exists(self, connection: sqlite3.Connection, table_name: str) -> bool:
        row = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
                AND name = ?
            """,
            (table_name,),
        ).fetchone()
        return row is not None

    def _column_names(self, connection: sqlite3.Connection, table_name: str) -> set[str]:
        return {
            str(row["name"])
            for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
        }

    def _ensure_boulder_problem(
        self,
        connection: sqlite3.Connection,
        name: str,
        area: str,
        sector: str,
    ) -> int:
        if not name.strip() or not area.strip():
            raise StorageError("Boulder name and area are required")

        connection.execute(
            """
            INSERT OR IGNORE INTO boulder_problems (name, area, sector)
            VALUES (?, ?, ?)
            """,
            (name, area, sector),
        )
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
        if row is None:
            raise StorageError(f"Could not create boulder problem: {name} in {area} / {sector}")
        return int(row["id"])

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
        return int(row["id"]) if row else None

    def _find_ascent(
        self,
        connection: sqlite3.Connection,
        name: str,
        area: str,
        sector: str,
        climber: str,
    ) -> sqlite3.Row | None:
        row = connection.execute(
            """
            SELECT
                ascents.id,
                ascents.boulder_id,
                ascents.user_id,
                ascents.climber
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
        return row

    def _ascent_exists(self, connection: sqlite3.Connection, ascent_id: int) -> bool:
        row = connection.execute(
            """
            SELECT id
            FROM ascents
            WHERE id = ?
            """,
            (ascent_id,),
        ).fetchone()
        return row is not None

    def _ascent_boulder_id(self, connection: sqlite3.Connection, ascent_id: int) -> int | None:
        row = connection.execute(
            """
            SELECT boulder_id
            FROM ascents
            WHERE id = ?
            """,
            (ascent_id,),
        ).fetchone()
        return int(row["boulder_id"]) if row else None

    def _delete_unused_problem(
        self,
        connection: sqlite3.Connection,
        problem_id: int,
    ) -> None:
        ascent_count = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM ascents
            WHERE boulder_id = ?
            """,
            (problem_id,),
        ).fetchone()
        if ascent_count is not None and int(ascent_count["count"]) > 0:
            return

        comment_count = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM boulder_comments
            WHERE boulder_id = ?
                AND deleted_at IS NULL
            """,
            (problem_id,),
        ).fetchone()
        if comment_count is not None and int(comment_count["count"]) > 0:
            return

        media_count = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM boulder_media
            WHERE boulder_id = ?
                AND deleted_at IS NULL
            """,
            (problem_id,),
        ).fetchone()
        if media_count is not None and int(media_count["count"]) > 0:
            return

        connection.execute(
            """
            DELETE FROM boulder_problems
            WHERE id = ?
            """,
            (problem_id,),
        )

    def _find_comment(
        self,
        connection: sqlite3.Connection,
        comment_id: int,
    ) -> BoulderComment | None:
        row = connection.execute(
            """
            SELECT
                comments.id,
                problems.name,
                problems.area,
                problems.sector,
                comments.user_id,
                comments.climber,
                comments.body,
                comments.created_at,
                comments.updated_at,
                COALESCE(NULLIF(users.display_name, ''), comments.climber)
                    AS climber_display_name
            FROM boulder_comments AS comments
            INNER JOIN boulder_problems AS problems
                ON problems.id = comments.boulder_id
            LEFT JOIN users
                ON users.deleted_at IS NULL
                AND (
                    users.id = comments.user_id
                    OR (
                        comments.user_id IS NULL
                        AND lower(users.username) = lower(comments.climber)
                    )
                )
            WHERE comments.id = ?
                AND comments.deleted_at IS NULL
            """,
            (comment_id,),
        ).fetchone()
        return self._comment_from_row(row) if row else None

    def _comment_from_row(self, row: sqlite3.Row) -> BoulderComment:
        return BoulderComment(
            id=int(row["id"]),
            boulder_name=str(row["name"]),
            area=str(row["area"]),
            sector=str(row["sector"]),
            climber=str(row["climber"]),
            body=str(row["body"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
            user_id=None if row["user_id"] is None else int(row["user_id"]),
            climber_display_name=str(row["climber_display_name"]),
        )

    def _ensure_comment_owner(
        self,
        comment: BoulderComment,
        climber: str,
        user_id: int | None,
    ) -> None:
        if comment.user_id is not None and comment.user_id != user_id:
            raise PermissionError("You can only edit your own comments")
        if comment.user_id is None and comment.climber.lower() != climber.lower():
            raise PermissionError("You can only edit your own comments")

    def _find_ascent_comment(
        self,
        connection: sqlite3.Connection,
        comment_id: int,
    ) -> AscentComment | None:
        row = connection.execute(
            """
            SELECT
                ascent_comments.id,
                ascent_comments.ascent_id,
                ascent_comments.user_id,
                ascent_comments.climber,
                ascent_comments.body,
                ascent_comments.created_at,
                ascent_comments.updated_at,
                COALESCE(NULLIF(users.display_name, ''), ascent_comments.climber)
                    AS climber_display_name
            FROM ascent_comments
            LEFT JOIN users
                ON users.deleted_at IS NULL
                AND (
                    users.id = ascent_comments.user_id
                    OR (
                        ascent_comments.user_id IS NULL
                        AND lower(users.username) = lower(ascent_comments.climber)
                    )
                )
            WHERE ascent_comments.id = ?
                AND ascent_comments.deleted_at IS NULL
            """,
            (comment_id,),
        ).fetchone()
        return self._ascent_comment_from_row(row) if row else None

    def _ascent_comment_from_row(self, row: sqlite3.Row) -> AscentComment:
        return AscentComment(
            id=int(row["id"]),
            ascent_id=int(row["ascent_id"]),
            climber=str(row["climber"]),
            body=str(row["body"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
            user_id=None if row["user_id"] is None else int(row["user_id"]),
            climber_display_name=str(row["climber_display_name"]),
        )

    def _ensure_ascent_comment_owner(
        self,
        comment: AscentComment,
        climber: str,
        user_id: int | None,
    ) -> None:
        if comment.user_id is not None and comment.user_id != user_id:
            raise PermissionError("You can only edit your own comments")
        if comment.user_id is None and comment.climber.lower() != climber.lower():
            raise PermissionError("You can only edit your own comments")

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
                media.climber,
                media.media_type,
                media.file_path,
                media.original_filename,
                media.mime_type,
                media.file_size,
                media.caption,
                media.created_at,
                media.updated_at,
                COALESCE(NULLIF(users.display_name, ''), media.climber)
                    AS climber_display_name
            FROM boulder_media AS media
            INNER JOIN boulder_problems AS problems
                ON problems.id = media.boulder_id
            LEFT JOIN users
                ON users.deleted_at IS NULL
                AND lower(users.username) = lower(media.climber)
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
            climber_display_name=str(row["climber_display_name"]),
        )

    def _ascent_values(
        self,
        record: BoulderRecord,
    ) -> tuple[str, str, str, str, int, str | None, int | None, str]:
        return (
            record.climber,
            record.grade_27crags,
            record.guide_grade,
            record.own_grade,
            1 if record.flash else 0,
            record.climbed_on.isoformat() if record.climbed_on else None,
            record.rating,
            record.visibility,
        )
