from __future__ import annotations

import os
from pathlib import Path


class AppSettings:
    """Application settings used by the API factory."""

    app_name = "Climbing Dashboard"
    local_frontend_origin_regex = r"^http://(localhost|127\.0\.0\.1):51\d{2}$"

    @property
    def default_database_path(self) -> Path:
        """Return the SQLite database used as the dashboard source of truth."""

        return Path(__file__).resolve().parents[3] / "data" / "climbing_dashboard.db"

    @property
    def allowed_cors_origins(self) -> list[str]:
        """Return extra browser origins allowed to call the API."""

        raw_origins = os.environ.get("CLIMBING_DASHBOARD_ALLOWED_ORIGINS", "")
        return [
            origin.strip().rstrip("/")
            for origin in raw_origins.split(",")
            if origin.strip()
        ]
