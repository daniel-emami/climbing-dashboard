from __future__ import annotations


class ProfileError(Exception):
    """Raised when a boulderer profile cannot be read or changed."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code
