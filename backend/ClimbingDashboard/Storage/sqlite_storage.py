from __future__ import annotations

import logging
import sqlite3
from pathlib import Path

from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Storage.base_storage import BaseStorage
from ClimbingDashboard.Utilities.date_utils import parse_climbed_date

logger = logging.getLogger(__name__)


class SqliteStorage(BaseStorage):
    """SQLite storage implementation for boulder problems and ascents."""

    def __init__(self, database_path: str | Path) -> None:
        """Create storage bound to one SQLite database path."""

        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._create_schema()

    def read_boulders(self) -> list[BoulderRecord]:
        """Read all stored ascent records joined with their boulder problem."""

        try:
            with self._connect() as connection:
                rows = connection.execute(
                    """
                    SELECT
                        problems.name,
                        problems.area,
                        ascents.grade_27crags,
                        ascents.guide_grade,
                        ascents.own_grade,
                        ascents.climber,
                        ascents.flash,
                        ascents.climbed_on,
                        ascents.rating
                    FROM ascents
                    INNER JOIN boulder_problems AS problems
                        ON problems.id = ascents.boulder_id
                    ORDER BY ascents.id
                    """
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
                climber=str(row["climber"]),
                flash=bool(row["flash"]),
                climbed_on=parse_climbed_date(row["climbed_on"]),
                rating=None if row["rating"] is None else int(row["rating"]),
            )
            for row in rows
        ]

    def append_boulder(self, record: BoulderRecord) -> BoulderRecord:
        """Append one boulder record to the database."""

        self.append_boulders([record])
        return record

    def append_boulders(self, records: list[BoulderRecord]) -> list[BoulderRecord]:
        """Append ascent records to the database, skipping duplicates."""

        appended_records: list[BoulderRecord] = []
        try:
            with self._connect() as connection:
                for record in records:
                    problem_id = self._ensure_boulder_problem(connection, record.name, record.area)
                    cursor = connection.execute(
                        """
                        INSERT OR IGNORE INTO ascents (
                            boulder_id,
                            climber,
                            grade_27crags,
                            guide_grade,
                            own_grade,
                            flash,
                            climbed_on,
                            rating
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (problem_id, *self._ascent_values(record)),
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
        original_climber: str,
        record: BoulderRecord,
    ) -> BoulderRecord:
        """Update one ascent matched by its original boulder, area, and climber."""

        try:
            with self._connect() as connection:
                target = self._find_ascent(
                    connection,
                    original_name,
                    original_area,
                    original_climber,
                )
                if target is None:
                    raise StorageError(
                        "Boulder does not exist: "
                        f"{original_name} in {original_area} for {original_climber}"
                    )

                old_problem_id = int(target["boulder_id"])
                new_problem_id = self._ensure_boulder_problem(
                    connection,
                    record.name,
                    record.area,
                )
                connection.execute(
                    """
                    UPDATE ascents
                    SET
                        boulder_id = ?,
                        climber = ?,
                        grade_27crags = ?,
                        guide_grade = ?,
                        own_grade = ?,
                        flash = ?,
                        climbed_on = ?,
                        rating = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (new_problem_id, *self._ascent_values(record), int(target["id"])),
                )
                if old_problem_id != new_problem_id:
                    self._delete_unused_problem(connection, old_problem_id)
        except sqlite3.IntegrityError as exc:
            raise StorageError(
                "Cannot update boulder. The key already exists: "
                f"{record.name} in {record.area} for {record.climber}"
            ) from exc
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to update boulder: {exc}") from exc

        return record

    def delete_boulder(self, name: str, area: str, climber: str) -> None:
        """Delete one ascent matched by boulder name, area, and climber."""

        try:
            with self._connect() as connection:
                target = self._find_ascent(connection, name, area, climber)
                if target is None:
                    raise StorageError(f"Boulder does not exist: {name} in {area} for {climber}")
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
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _create_schema(self) -> None:
        try:
            with self._connect() as connection:
                self._create_normalized_tables(connection)
                self._migrate_legacy_boulders_table(connection)
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to create SQLite schema: {exc}") from exc

    def _create_normalized_tables(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS boulder_problems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                area TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS boulder_problems_unique_key
            ON boulder_problems (lower(name), lower(area))
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ascents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                boulder_id INTEGER NOT NULL,
                climber TEXT NOT NULL DEFAULT '',
                grade_27crags TEXT NOT NULL DEFAULT '',
                guide_grade TEXT NOT NULL DEFAULT '',
                own_grade TEXT NOT NULL DEFAULT '',
                flash INTEGER NOT NULL DEFAULT 0,
                climbed_on TEXT,
                rating INTEGER,
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
            )
            connection.execute(
                """
                INSERT OR IGNORE INTO ascents (
                    boulder_id,
                    climber,
                    grade_27crags,
                    guide_grade,
                    own_grade,
                    flash,
                    climbed_on,
                    rating,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?,
                    COALESCE(?, CURRENT_TIMESTAMP),
                    COALESCE(?, CURRENT_TIMESTAMP)
                )
                """,
                (
                    problem_id,
                    str(row["climber"]),
                    str(row["grade_27crags"]),
                    str(row["guide_grade"]),
                    str(row["own_grade"]),
                    1 if row["flash"] else 0,
                    row["climbed_on"],
                    row["rating"],
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
        if "rating" not in columns:
            connection.execute("ALTER TABLE boulders ADD COLUMN rating INTEGER")

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
    ) -> int:
        if not name.strip() or not area.strip():
            raise StorageError("Boulder name and area are required")

        connection.execute(
            """
            INSERT OR IGNORE INTO boulder_problems (name, area)
            VALUES (?, ?)
            """,
            (name, area),
        )
        row = connection.execute(
            """
            SELECT id
            FROM boulder_problems
            WHERE lower(name) = lower(?)
                AND lower(area) = lower(?)
            """,
            (name, area),
        ).fetchone()
        if row is None:
            raise StorageError(f"Could not create boulder problem: {name} in {area}")
        return int(row["id"])

    def _find_ascent(
        self,
        connection: sqlite3.Connection,
        name: str,
        area: str,
        climber: str,
    ) -> sqlite3.Row | None:
        row = connection.execute(
            """
            SELECT
                ascents.id,
                ascents.boulder_id
            FROM ascents
            INNER JOIN boulder_problems AS problems
                ON problems.id = ascents.boulder_id
            WHERE lower(problems.name) = lower(?)
                AND lower(problems.area) = lower(?)
                AND lower(ascents.climber) = lower(?)
            """,
            (name, area, climber),
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
    ) -> tuple[str, str, str, str, int, str | None, int | None]:
        return (
            record.climber,
            record.grade_27crags,
            record.guide_grade,
            record.own_grade,
            1 if record.flash else 0,
            record.climbed_on.isoformat() if record.climbed_on else None,
            record.rating,
        )
