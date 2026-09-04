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

    def to_payload(self) -> dict[str, object]:
        """Return the user fields that are safe for the frontend."""

        return {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
