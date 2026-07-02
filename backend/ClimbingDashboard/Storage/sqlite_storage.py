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
    """SQLite storage implementation for climbed boulders."""

    def __init__(self, database_path: str | Path) -> None:
        """Create storage bound to one SQLite database path."""

        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._create_schema()

    def read_boulders(self) -> list[BoulderRecord]:
        """Read all stored boulder records."""

        try:
            with self._connect() as connection:
                rows = connection.execute(
                    """
                    SELECT
                        name,
                        grade_27crags,
                        guide_grade,
                        own_grade,
                        area,
                        climber,
                        flash,
                        climbed_on
                    FROM boulders
                    ORDER BY id
                    """
                ).fetchall()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read boulders: {exc}") from exc

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
            )
            for row in rows
        ]

    def append_boulder(self, record: BoulderRecord) -> BoulderRecord:
        """Append one boulder record to the database."""

        self.append_boulders([record])
        return record

    def append_boulders(self, records: list[BoulderRecord]) -> list[BoulderRecord]:
        """Append boulder records to the database, skipping duplicates."""

        appended_records: list[BoulderRecord] = []
        try:
            with self._connect() as connection:
                for record in records:
                    cursor = connection.execute(
                        """
                        INSERT OR IGNORE INTO boulders (
                            name,
                            grade_27crags,
                            guide_grade,
                            own_grade,
                            area,
                            climber,
                            flash,
                            climbed_on
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        self._record_values(record),
                    )
                    if cursor.rowcount > 0:
                        appended_records.append(record)
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to append boulders: {exc}") from exc

        logger.info("Appended %s boulders to %s", len(appended_records), self.database_path)
        return appended_records

    def update_boulder(
        self,
        original_name: str,
        original_area: str,
        original_climber: str,
        record: BoulderRecord,
    ) -> BoulderRecord:
        """Update one boulder matched by its original name, area, and climber."""

        try:
            with self._connect() as connection:
                target_id = self._find_boulder_id(
                    connection,
                    original_name,
                    original_area,
                    original_climber,
                )
                if target_id is None:
                    raise StorageError(
                        "Boulder does not exist: "
                        f"{original_name} in {original_area} for {original_climber}"
                    )

                connection.execute(
                    """
                    UPDATE boulders
                    SET
                        name = ?,
                        grade_27crags = ?,
                        guide_grade = ?,
                        own_grade = ?,
                        area = ?,
                        climber = ?,
                        flash = ?,
                        climbed_on = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (*self._record_values(record), target_id),
                )
        except sqlite3.IntegrityError as exc:
            raise StorageError(
                "Cannot update boulder. The key already exists: "
                f"{record.name} in {record.area} for {record.climber}"
            ) from exc
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to update boulder: {exc}") from exc

        return record

    def delete_boulder(self, name: str, area: str, climber: str) -> None:
        """Delete one boulder matched by name, area, and climber."""

        try:
            with self._connect() as connection:
                cursor = connection.execute(
                    """
                    DELETE FROM boulders
                    WHERE lower(name) = lower(?)
                        AND lower(area) = lower(?)
                        AND lower(climber) = lower(?)
                    """,
                    (name, area, climber),
                )
                if cursor.rowcount == 0:
                    raise StorageError(f"Boulder does not exist: {name} in {area} for {climber}")
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to delete boulder: {exc}") from exc

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _create_schema(self) -> None:
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    CREATE TABLE IF NOT EXISTS boulders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        grade_27crags TEXT NOT NULL DEFAULT '',
                        guide_grade TEXT NOT NULL DEFAULT '',
                        own_grade TEXT NOT NULL DEFAULT '',
                        area TEXT NOT NULL,
                        climber TEXT NOT NULL DEFAULT '',
                        flash INTEGER NOT NULL DEFAULT 0,
                        climbed_on TEXT,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
                self._migrate_schema(connection)
                connection.execute(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS boulders_unique_key
                    ON boulders (lower(name), lower(area), lower(climber))
                    """
                )
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to create SQLite schema: {exc}") from exc

    def _migrate_schema(self, connection: sqlite3.Connection) -> None:
        columns = {
            str(row["name"])
            for row in connection.execute("PRAGMA table_info(boulders)").fetchall()
        }
        if "my_grade" in columns and "own_grade" not in columns:
            connection.execute("ALTER TABLE boulders RENAME COLUMN my_grade TO own_grade")

    def _find_boulder_id(
        self,
        connection: sqlite3.Connection,
        name: str,
        area: str,
        climber: str,
    ) -> int | None:
        row = connection.execute(
            """
            SELECT id
            FROM boulders
            WHERE lower(name) = lower(?)
                AND lower(area) = lower(?)
                AND lower(climber) = lower(?)
            """,
            (name, area, climber),
        ).fetchone()
        return int(row["id"]) if row else None

    def _record_values(
        self,
        record: BoulderRecord,
    ) -> tuple[str, str, str, str, str, str, int, str | None]:
        return (
            record.name,
            record.grade_27crags,
            record.guide_grade,
            record.own_grade,
            record.area,
            record.climber,
            1 if record.flash else 0,
            record.climbed_on.isoformat() if record.climbed_on else None,
        )
