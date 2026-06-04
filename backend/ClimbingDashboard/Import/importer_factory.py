from __future__ import annotations

from ClimbingDashboard.Import.base_ascents_importer import BaseAscentsImporter
from ClimbingDashboard.Import.the_topo_importer import TheTopoAscentsImporter


class AscentsImporterFactory:
    """Factory for external ascents importers."""

    def __init__(self) -> None:
        """Create the importer registry."""

        self._importers: dict[str, BaseAscentsImporter] = {
            TheTopoAscentsImporter.source: TheTopoAscentsImporter(),
        }

    def get_importer(self, source: str) -> BaseAscentsImporter:
        """Return an importer for a supported source name."""

        normalized_source = source.strip().lower()
        importer = self._importers.get(normalized_source)
        if importer is None:
            supported_sources = ", ".join(sorted(self._importers))
            raise ValueError(
                f"Unknown import source {source!r}. Supported sources: {supported_sources}"
            )
        return importer
