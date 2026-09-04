from __future__ import annotations

from dataclasses import dataclass

from ClimbingDashboard.Models.user_account import UserAccount


@dataclass(frozen=True)
class AuthSession:
    """A newly created browser session."""

    user: UserAccount
    token: str
    expires_at: str
