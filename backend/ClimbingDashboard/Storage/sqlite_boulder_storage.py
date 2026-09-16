from __future__ import annotations

import logging
import sqlite3
from pathlib import Path

from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Storage.sqlite_connection import connect_sqlite
from ClimbingDashboard.Utilities.date_utils import parse_climbed_date

logger = logging.getLogger(__name__)


class SqliteBoulderStorage:
    """SQLite-backed storage for boulder problems and ascent records."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)

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

    def _connect(self) -> sqlite3.Connection:
        return connect_sqlite(self.database_path)

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
