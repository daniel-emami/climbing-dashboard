from __future__ import annotations

import re
from typing import Any


class SignupRequest:
    """Validated request object for creating a new account."""

    _USERNAME_PATTERN = re.compile(r"^[a-z0-9_.-]{3,40}$")
    _MIN_PASSWORD_LENGTH = 8

    def __init__(
        self,
        username: object,
        password: object,
        invite_code: object,
        display_name: object = "",
    ) -> None:
        self.username = self._username(username)
        self.password = self._password(password)
        self.invite_code = self._required_text(invite_code, "invite_code")
        self.display_name = self._optional_text(display_name)

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> SignupRequest:
        """Build a signup request from a JSON-like dictionary."""

        return cls(
            username=payload.get("username"),
            password=payload.get("password"),
            invite_code=payload.get("invite_code"),
            display_name=payload.get("display_name", ""),
        )

    @classmethod
    def _username(cls, value: object) -> str:
        text = cls._required_text(value, "username").lower()
        if not cls._USERNAME_PATTERN.fullmatch(text):
            raise ValueError(
                "username must be 3-40 characters and use letters, numbers, _, ., or -"
            )
        return text

    @classmethod
    def _password(cls, value: object) -> str:
        password = cls._required_text(value, "password")
        if len(password) < cls._MIN_PASSWORD_LENGTH:
            raise ValueError("password must be at least 8 characters")
        if len(password) > 128:
            raise ValueError("password must be 128 characters or fewer")
        return password

    @staticmethod
    def _required_text(value: object, field_name: str) -> str:
        text = "" if value is None else str(value).strip()
        if not text:
            raise ValueError(f"{field_name} is required")
        return text

    @staticmethod
    def _optional_text(value: object) -> str:
        return "" if value is None else str(value).strip()


class LoginRequest:
    """Validated request object for logging in."""

    def __init__(self, username: object, password: object) -> None:
        self.username = SignupRequest._username(username)
        self.password = SignupRequest._required_text(password, "password")

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> LoginRequest:
        """Build a login request from a JSON-like dictionary."""

        return cls(
            username=payload.get("username"),
            password=payload.get("password"),
        )


type AuthPayload = dict[str, object]
