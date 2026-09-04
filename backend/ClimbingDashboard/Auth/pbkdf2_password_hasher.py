from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

from ClimbingDashboard.Auth.base_password_hasher import BasePasswordHasher


class Pbkdf2PasswordHasher(BasePasswordHasher):
    """Password hasher backed by Python's PBKDF2-HMAC implementation."""

    algorithm = "pbkdf2_sha256"
    salt_bytes = 16

    def __init__(self, iterations: int = 600_000) -> None:
        """Create a hasher with a configurable work factor."""

        self.iterations = iterations

    def hash_password(self, password: str) -> str:
        """Return a salted password hash string."""

        salt = secrets.token_bytes(self.salt_bytes)
        digest = self._derive_key(password, salt, self.iterations)
        return "$".join(
            (
                self.algorithm,
                str(self.iterations),
                self._encode(salt),
                self._encode(digest),
            )
        )

    def verify_password(self, password: str, password_hash: str) -> bool:
        """Return whether the password matches the stored hash string."""

        try:
            algorithm, iterations_text, salt_text, digest_text = password_hash.split("$", 3)
            if algorithm != self.algorithm:
                return False
            iterations = int(iterations_text)
            salt = self._decode(salt_text)
            expected_digest = self._decode(digest_text)
        except (ValueError, TypeError):
            return False

        actual_digest = self._derive_key(password, salt, iterations)
        return hmac.compare_digest(actual_digest, expected_digest)

    def _derive_key(self, password: str, salt: bytes, iterations: int) -> bytes:
        return hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
        )

    def _encode(self, value: bytes) -> str:
        return base64.urlsafe_b64encode(value).decode("ascii")

    def _decode(self, value: str) -> bytes:
        return base64.urlsafe_b64decode(value.encode("ascii"))
