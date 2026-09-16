from __future__ import annotations

import sqlite3
from pathlib import Path

from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.ascent_comment import AscentComment
from ClimbingDashboard.Models.boulder_comment import BoulderComment
from ClimbingDashboard.Storage.sqlite_connection import connect_sqlite


class SqliteCommentStorage:
    """SQLite-backed storage for boulder and ascent comments."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)

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
