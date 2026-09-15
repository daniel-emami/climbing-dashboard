from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path

from ClimbingDashboard.Api.auth_models import (
    AdminPasswordResetRequest,
    LoginRequest,
    SignupRequest,
)
from ClimbingDashboard.Auth.base_password_hasher import BasePasswordHasher
from ClimbingDashboard.Auth.pbkdf2_password_hasher import Pbkdf2PasswordHasher
from ClimbingDashboard.Exceptions.auth_error import AuthError
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.auth_session import AuthSession
from ClimbingDashboard.Models.generated_password_reset import GeneratedPasswordReset
from ClimbingDashboard.Models.user_account import UserAccount
from ClimbingDashboard.Storage.sqlite_auth_storage import SqliteAuthStorage


class AuthService:
    """Coordinates invite-gated users and cookie-backed sessions."""

    _TEMPORARY_PASSWORD_ALPHABET = (
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    )

    def __init__(
        self,
        database_path: str | Path,
        invite_code: str,
        session_lifetime_days: int,
        password_hasher: BasePasswordHasher | None = None,
        admin_usernames: list[str] | None = None,
    ) -> None:
        """Create the auth service."""

        self.storage = SqliteAuthStorage(database_path)
        self.invite_code = invite_code.strip()
        self.session_lifetime = timedelta(days=session_lifetime_days)
        self.admin_usernames = frozenset(
            username.strip().lower() for username in (admin_usernames or []) if username.strip()
        )
        self.password_hasher = (
            password_hasher if password_hasher is not None else Pbkdf2PasswordHasher()
        )

    def signup(self, request: SignupRequest) -> AuthSession:
        """Create a user account and return a logged-in session."""

        if not self.invite_code:
            raise AuthError("Signup invite code is not configured", status_code=400)
        if not hmac.compare_digest(request.invite_code, self.invite_code):
            raise AuthError("Invite code is not valid", status_code=403)

        display_name = request.display_name or request.username
        password_hash = self.password_hasher.hash_password(request.password)
        try:
            user = self.storage.create_user(
                username=request.username,
                display_name=display_name,
                password_hash=password_hash,
            )
        except StorageError as exc:
            raise AuthError(str(exc), status_code=409) from exc

        return self._create_session(self._with_admin_role(user))

    def login(self, request: LoginRequest) -> AuthSession:
        """Verify credentials and return a logged-in session."""

        try:
            credentials = self.storage.read_user_credentials(request.username)
        except StorageError as exc:
            raise AuthError(f"Could not read user: {exc}", status_code=500) from exc

        if credentials is None:
            raise AuthError("Username or password is not correct", status_code=401)
        if not self.password_hasher.verify_password(request.password, credentials.password_hash):
            raise AuthError("Username or password is not correct", status_code=401)

        return self._create_session(self._with_admin_role(credentials.to_user_account()))

    def logout(self, session_token: str | None) -> None:
        """Revoke a browser session if one exists."""

        if not session_token:
            return
        try:
            self.storage.revoke_session(self._session_token_hash(session_token))
        except StorageError as exc:
            raise AuthError(f"Could not log out: {exc}", status_code=500) from exc

    def current_user(self, session_token: str | None) -> UserAccount | None:
        """Return the logged-in user for a browser session token."""

        if not session_token:
            return None
        try:
            user = self.storage.read_user_by_session_hash(
                self._session_token_hash(session_token),
                self._now(),
            )
            return self._with_admin_role(user) if user is not None else None
        except StorageError as exc:
            raise AuthError(f"Could not read session: {exc}", status_code=500) from exc

    def reset_user_password(
        self,
        request: AdminPasswordResetRequest,
        current_user: UserAccount,
    ) -> GeneratedPasswordReset:
        """Generate a replacement password for an account as an administrator."""

        if not current_user.is_admin:
            raise AuthError("Administrator access is required", status_code=403)

        temporary_password = self._generate_temporary_password()
        password_hash = self.password_hasher.hash_password(temporary_password)
        try:
            user = self.storage.reset_password_and_revoke_sessions(
                request.username,
                password_hash,
            )
        except StorageError as exc:
            raise AuthError(f"Could not reset password: {exc}", status_code=500) from exc
        if user is None:
            raise AuthError(f"User does not exist: {request.username}", status_code=404)
        return GeneratedPasswordReset(
            username=user.username,
            display_name=user.display_name,
            temporary_password=temporary_password,
        )

    def _create_session(self, user: UserAccount) -> AuthSession:
        session_token = secrets.token_urlsafe(32)
        expires_at = self._datetime_to_text(datetime.now(UTC) + self.session_lifetime)
        try:
            self.storage.create_session(
                user_id=user.id,
                session_token_hash=self._session_token_hash(session_token),
                expires_at=expires_at,
            )
        except StorageError as exc:
            raise AuthError(f"Could not create session: {exc}", status_code=500) from exc
        return AuthSession(user=user, token=session_token, expires_at=expires_at)

    def _session_token_hash(self, session_token: str) -> str:
        return hashlib.sha256(session_token.encode("utf-8")).hexdigest()

    def _with_admin_role(self, user: UserAccount) -> UserAccount:
        return replace(user, is_admin=user.username.lower() in self.admin_usernames)

    def _generate_temporary_password(self) -> str:
        return "-".join(
            "".join(secrets.choice(self._TEMPORARY_PASSWORD_ALPHABET) for _ in range(4))
            for _ in range(4)
        )

    def _now(self) -> str:
        return self._datetime_to_text(datetime.now(UTC))

    def _datetime_to_text(self, value: datetime) -> str:
        return value.replace(microsecond=0).isoformat()
