from __future__ import annotations

from abc import ABC, abstractmethod

from ClimbingDashboard.Models.user_account import UserAccount
from ClimbingDashboard.Models.user_credentials import UserCredentials


class BaseAuthStorage(ABC):
    """Interface for user and session persistence."""

    @abstractmethod
    def create_user(
        self,
        username: str,
        display_name: str,
        password_hash: str,
    ) -> UserAccount:
        """Create and return one registered user."""

    @abstractmethod
    def read_user_credentials(self, username: str) -> UserCredentials | None:
        """Return user credentials for login, if the user exists."""

    @abstractmethod
    def read_user_by_session_hash(
        self,
        session_token_hash: str,
        now: str,
    ) -> UserAccount | None:
        """Return the user attached to a live session."""

    @abstractmethod
    def create_session(
        self,
        user_id: int,
        session_token_hash: str,
        expires_at: str,
    ) -> None:
        """Persist one browser session."""

    @abstractmethod
    def revoke_session(self, session_token_hash: str) -> None:
        """Mark one browser session as no longer usable."""
