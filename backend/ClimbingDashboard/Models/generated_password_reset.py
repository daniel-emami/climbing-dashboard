from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GeneratedPasswordReset:
    """A generated replacement password returned once to an administrator."""

    username: str
    display_name: str
    temporary_password: str

    def to_payload(self) -> dict[str, str]:
        """Return the reset result for the administrator."""

        return {
            "username": self.username,
            "display_name": self.display_name,
            "temporary_password": self.temporary_password,
        }
