from __future__ import annotations

import os
from pathlib import Path


class AppSettings:
    """Application settings used by the API factory."""

    app_name = "Climbing Dashboard"
    local_frontend_origin_regex = r"^http://(localhost|127\.0\.0\.1):51\d{2}$"
    session_cookie_name = "climbing_dashboard_session"
    session_lifetime_days = 14

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

    @property
    def signup_invite_code(self) -> str:
        """Return the invite code required when creating a user."""

        return os.environ.get("CLIMBING_DASHBOARD_INVITE_CODE", "").strip()

    @property
    def secure_auth_cookies(self) -> bool:
        """Return whether session cookies should be marked secure-only."""

        raw_value = os.environ.get("CLIMBING_DASHBOARD_SECURE_COOKIES", "")
        return raw_value.strip().lower() in {"1", "true", "yes", "y"}

    @property
    def session_cookie_max_age_seconds(self) -> int:
        """Return the browser cookie lifetime in seconds."""

        return self.session_lifetime_days * 24 * 60 * 60
