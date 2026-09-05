from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AscentComment:
    """One public comment on a specific ascent."""

    id: int
    ascent_id: int
    climber: str
    body: str
    created_at: str
    updated_at: str

    def to_payload(self) -> dict[str, object]:
        """Return a frontend-friendly representation."""

        return {
            "id": self.id,
            "ascent_id": self.ascent_id,
            "climber": self.climber,
            "body": self.body,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
