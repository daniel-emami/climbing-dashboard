from __future__ import annotations

import sqlite3
from pathlib import Path


def connect_sqlite(database_path: str | Path) -> sqlite3.Connection:
    """Open a SQLite connection configured for the app's storage code."""

    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection
