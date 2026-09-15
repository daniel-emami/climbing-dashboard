from __future__ import annotations

from dataclasses import dataclass

from ClimbingDashboard.Config.constants import ASCENT_VISIBILITY_PRIVATE


@dataclass(frozen=True)
class BoulderMedia:
    """One uploaded media item attached to a boulder problem."""

    id: int
    boulder_name: str
    area: str
    sector: str
    ascent_id: int | None
    climber: str
    media_type: str
    file_path: str
    original_filename: str
    mime_type: str
    file_size: int
    caption: str
    created_at: str
    updated_at: str
    user_id: int | None = None
    visibility: str = ASCENT_VISIBILITY_PRIVATE
    climber_display_name: str = ""

    def to_payload(self) -> dict[str, object]:
        """Return a frontend-friendly representation."""

        return {
            "id": self.id,
            "boulder_name": self.boulder_name,
            "area": self.area,
            "sector": self.sector,
            "ascent_id": self.ascent_id,
            "climber": self.climber,
            "media_type": self.media_type,
            "url": f"/api/boulders/media/{self.id}/content",
            "original_filename": self.original_filename,
            "mime_type": self.mime_type,
            "file_size": self.file_size,
            "caption": self.caption,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "user_id": self.user_id,
            "visibility": self.visibility,
            "climber_display_name": self.climber_display_name or self.climber,
        }
