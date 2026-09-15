from __future__ import annotations

from dataclasses import dataclass

from ClimbingDashboard.Models.user_account import UserAccount


@dataclass(frozen=True)
class UserCredentials:
    """User row including the password hash used during login."""

    id: int
    username: str
    display_name: str
    password_hash: str
    created_at: str
    updated_at: str
    profile_picture_path: str | None = None
    profile_picture_mime_type: str | None = None

    def to_user_account(self) -> UserAccount:
        """Return the public account representation."""

        return UserAccount(
            id=self.id,
            username=self.username,
            display_name=self.display_name,
            created_at=self.created_at,
            updated_at=self.updated_at,
            profile_picture_path=self.profile_picture_path,
            profile_picture_mime_type=self.profile_picture_mime_type,
        )
