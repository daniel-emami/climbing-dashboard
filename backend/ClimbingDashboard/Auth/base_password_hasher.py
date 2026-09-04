from __future__ import annotations

from abc import ABC, abstractmethod


class BasePasswordHasher(ABC):
    """Interface for password hashing implementations."""

    @abstractmethod
    def hash_password(self, password: str) -> str:
        """Return a storage-safe password hash."""

    @abstractmethod
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Return whether the password matches a stored hash."""
