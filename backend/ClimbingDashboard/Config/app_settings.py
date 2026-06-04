from __future__ import annotations

from pathlib import Path


class AppSettings:
    """Application settings used by the API factory."""

    app_name = "Climbing Dashboard"

    @property
    def default_excel_path(self) -> Path:
        """Return the workbook used as the dashboard source of truth."""

        return Path(__file__).resolve().parents[3] / "data" / "Boulders_Ticklist.xlsx"
