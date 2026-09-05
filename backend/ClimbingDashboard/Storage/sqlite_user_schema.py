from __future__ import annotations

import sqlite3


def ensure_users_schema(connection: sqlite3.Connection) -> None:
    """Create the shared user table and username index when needed."""

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            display_name TEXT NOT NULL DEFAULT '',
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        )
        """
    )
    connection.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_key
        ON users (lower(username))
        WHERE deleted_at IS NULL
        """
    )
