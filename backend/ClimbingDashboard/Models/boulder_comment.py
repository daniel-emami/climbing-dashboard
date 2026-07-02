from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BoulderComment:
    """One public comment on a boulder problem."""

    id: int
    boulder_name: str
    area: str
    climber: str
    body: str
    created_at: str
    updated_at: str

    def to_payload(self) -> dict[str, object]:
        """Return a frontend-friendly representation."""

        return {
            "id": self.id,
            "boulder_name": self.boulder_name,
            "area": self.area,
            "climber": self.climber,
            "body": self.body,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
