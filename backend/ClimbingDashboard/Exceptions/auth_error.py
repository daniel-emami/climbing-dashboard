from __future__ import annotations


class AuthError(Exception):
    """Raised when authentication or authorization fails."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code
