from __future__ import annotations

import sqlite3
from pathlib import Path

from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.user_account import UserAccount
from ClimbingDashboard.Models.user_credentials import UserCredentials
from ClimbingDashboard.Storage.base_auth_storage import BaseAuthStorage


class SqliteAuthStorage(BaseAuthStorage):
    """SQLite-backed storage for users and browser sessions."""

    def __init__(self, database_path: str | Path) -> None:
        """Create auth storage bound to the shared dashboard database."""

        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._create_schema()

    def create_user(
        self,
        username: str,
        display_name: str,
        password_hash: str,
    ) -> UserAccount:
        """Create and return one registered user."""

        try:
            with self._connect() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO users (username, display_name, password_hash)
                    VALUES (?, ?, ?)
                    """,
                    (username, display_name, password_hash),
                )
                user = self._read_user_by_id(connection, int(cursor.lastrowid))
                if user is None:
                    raise StorageError("Could not read newly created user")
        except sqlite3.IntegrityError as exc:
            raise StorageError(f"Username is already taken: {username}") from exc
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to create user: {exc}") from exc

        return user

    def read_user_credentials(self, username: str) -> UserCredentials | None:
        """Return user credentials for login, if the user exists."""

        try:
            with self._connect() as connection:
                row = connection.execute(
                    """
                    SELECT
                        id,
                        username,
                        display_name,
                        password_hash,
                        created_at,
                        updated_at
                    FROM users
                    WHERE lower(username) = lower(?)
                        AND deleted_at IS NULL
                    """,
                    (username,),
                ).fetchone()
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read user credentials: {exc}") from exc

        return self._credentials_from_row(row) if row else None

    def read_user_by_session_hash(
        self,
        session_token_hash: str,
        now: str,
    ) -> UserAccount | None:
        """Return the user attached to a live session."""

        try:
            with self._connect() as connection:
                row = connection.execute(
                    """
                    SELECT
                        users.id,
                        users.username,
                        users.display_name,
                        users.created_at,
                        users.updated_at
                    FROM auth_sessions
                    INNER JOIN users
                        ON users.id = auth_sessions.user_id
                    WHERE auth_sessions.session_token_hash = ?
                        AND auth_sessions.revoked_at IS NULL
                        AND auth_sessions.expires_at > ?
                        AND users.deleted_at IS NULL
                    """,
                    (session_token_hash, now),
                ).fetchone()
                if row is not None:
                    connection.execute(
                        """
                        UPDATE auth_sessions
                        SET last_seen_at = CURRENT_TIMESTAMP
                        WHERE session_token_hash = ?
                        """,
                        (session_token_hash,),
                    )
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to read session user: {exc}") from exc

        return self._user_from_row(row) if row else None

    def create_session(
        self,
        user_id: int,
        session_token_hash: str,
        expires_at: str,
    ) -> None:
        """Persist one browser session."""

        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO auth_sessions (user_id, session_token_hash, expires_at)
                    VALUES (?, ?, ?)
                    """,
                    (user_id, session_token_hash, expires_at),
                )
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to create auth session: {exc}") from exc

    def revoke_session(self, session_token_hash: str) -> None:
        """Mark one browser session as no longer usable."""

        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    UPDATE auth_sessions
                    SET revoked_at = CURRENT_TIMESTAMP
                    WHERE session_token_hash = ?
                    """,
                    (session_token_hash,),
                )
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to revoke auth session: {exc}") from exc

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _create_schema(self) -> None:
        try:
            with self._connect() as connection:
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
                connection.execute(
                    """
                    CREATE TABLE IF NOT EXISTS auth_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        session_token_hash TEXT NOT NULL,
                        expires_at TEXT NOT NULL,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        revoked_at TEXT,
                        FOREIGN KEY (user_id)
                            REFERENCES users(id)
                            ON DELETE CASCADE
                    )
                    """
                )
                connection.execute(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_unique_key
                    ON auth_sessions (session_token_hash)
                    """
                )
                connection.execute(
                    """
                    CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
                    ON auth_sessions (user_id, expires_at)
                    """
                )
        except sqlite3.Error as exc:
            raise StorageError(f"Failed to create auth schema: {exc}") from exc

    def _read_user_by_id(
        self,
        connection: sqlite3.Connection,
        user_id: int,
    ) -> UserAccount | None:
        row = connection.execute(
            """
            SELECT id, username, display_name, created_at, updated_at
            FROM users
            WHERE id = ?
                AND deleted_at IS NULL
            """,
            (user_id,),
        ).fetchone()
        return self._user_from_row(row) if row else None

    def _user_from_row(self, row: sqlite3.Row) -> UserAccount:
        return UserAccount(
            id=int(row["id"]),
            username=str(row["username"]),
            display_name=str(row["display_name"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )

    def _credentials_from_row(self, row: sqlite3.Row) -> UserCredentials:
        return UserCredentials(
            id=int(row["id"]),
            username=str(row["username"]),
            display_name=str(row["display_name"]),
            password_hash=str(row["password_hash"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )
