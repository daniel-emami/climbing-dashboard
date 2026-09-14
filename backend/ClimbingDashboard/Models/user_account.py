from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class UserAccount:
    """One registered dashboard user."""

    id: int
    username: str
    display_name: str
    created_at: str
    updated_at: str
    profile_picture_path: str | None = None
    profile_picture_mime_type: str | None = None
    is_admin: bool = False

    def to_payload(self) -> dict[str, object]:
        """Return the user fields that are safe for the frontend."""

        return {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "profile_picture_url": (
                f"/api/boulderers/{self.username}/profile-picture"
                if self.profile_picture_path
                else None
            ),
            "is_admin": self.is_admin,
        }
