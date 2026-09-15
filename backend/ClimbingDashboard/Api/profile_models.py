from __future__ import annotations

from typing import Any


class ProfileUpdateRequest:
    """Validated editable text fields for a boulderer profile."""

    def __init__(self, display_name: object) -> None:
        text = "" if display_name is None else str(display_name).strip()
        if not text:
            raise ValueError("display_name is required")
        if len(text) > 80:
            raise ValueError("display_name must be 80 characters or fewer")
        self.display_name = text

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> ProfileUpdateRequest:
        return cls(display_name=payload.get("display_name"))
