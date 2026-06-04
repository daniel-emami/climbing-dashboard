from __future__ import annotations

from abc import ABC, abstractmethod

from ClimbingDashboard.Import.import_preview import ImportPreview


class BaseAscentsImporter(ABC):
    """Interface for external boulder ascent importers."""

    @abstractmethod
    def preview(self, username: str) -> ImportPreview:
        """Return a preview of imported boulder ascents for one user."""
