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
            profile_picture_path TEXT,
            profile_picture_mime_type TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        )
        """
    )
    columns = {
        str(row["name"])
        for row in connection.execute("PRAGMA table_info(users)").fetchall()
    }
    if "profile_picture_path" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN profile_picture_path TEXT")
    if "profile_picture_mime_type" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN profile_picture_mime_type TEXT")
    connection.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_key
        ON users (lower(username))
        WHERE deleted_at IS NULL
        """
    )
