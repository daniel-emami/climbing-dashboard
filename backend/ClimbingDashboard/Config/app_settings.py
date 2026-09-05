from __future__ import annotations

import os
from pathlib import Path

from ClimbingDashboard.Config.constants import DEFAULT_MAX_VIDEO_UPLOAD_BYTES


class AppSettings:
    """Application settings used by the API factory."""

    app_name = "Climbing Dashboard"
    local_frontend_origin_regex = r"^http://(localhost|127\.0\.0\.1):51\d{2}$"

    @property
    def default_database_path(self) -> Path:
        """Return the SQLite database used as the dashboard source of truth."""

        return Path(__file__).resolve().parents[3] / "data" / "climbing_dashboard.db"

    @property
    def uploads_path(self) -> Path:
        """Return the local directory used for uploaded media files."""

        configured_path = os.environ.get("CLIMBING_DASHBOARD_UPLOADS_PATH", "").strip()
        if configured_path:
            return Path(configured_path)
        return Path(__file__).resolve().parents[3] / "data" / "uploads"

    @property
    def max_video_upload_bytes(self) -> int:
        """Return the largest accepted video upload size in bytes."""

        raw_limit = os.environ.get("CLIMBING_DASHBOARD_MAX_VIDEO_UPLOAD_BYTES", "").strip()
        if not raw_limit:
            return DEFAULT_MAX_VIDEO_UPLOAD_BYTES
        try:
            return int(raw_limit)
        except ValueError:
            return DEFAULT_MAX_VIDEO_UPLOAD_BYTES

    @property
    def allowed_cors_origins(self) -> list[str]:
        """Return extra browser origins allowed to call the API."""

        raw_origins = os.environ.get("CLIMBING_DASHBOARD_ALLOWED_ORIGINS", "")
        return [
            origin.strip().rstrip("/")
            for origin in raw_origins.split(",")
            if origin.strip()
        ]
