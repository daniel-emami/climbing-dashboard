from __future__ import annotations

import sqlite3
from pathlib import Path

from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Storage.sqlite_connection import connect_sqlite
from ClimbingDashboard.Storage.sqlite_user_schema import ensure_users_schema


class SqliteSchema:
    """Creates the current SQLite schema used by the application."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)

    def ensure_schema(self) -> None:
        """Create the current tables when the local database is empty."""

        try:
            with self._connect() as connection:
                self._create_tables(connection)
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to create SQLite schema: {exc}") from exc

    def _connect(self) -> sqlite3.Connection:
        return connect_sqlite(self.database_path)

    def _create_tables(self, connection: sqlite3.Connection) -> None:
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
        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS boulder_problems_unique_key
            ON boulder_problems (lower(name), lower(area), lower(sector))
            """
        )
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
                user_id INTEGER,
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
