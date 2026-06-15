from __future__ import annotations

from dataclasses import replace

from ClimbingDashboard.Import.base_ascents_importer import BaseAscentsImporter
from ClimbingDashboard.Import.import_preview import ImportPreview
from ClimbingDashboard.Import.the_topo_client import TheTopoClient
from ClimbingDashboard.Import.the_topo_parser import TheTopoParser


class TheTopoAscentsImporter(BaseAscentsImporter):
    """Importer for public TheTopo boulder ascents."""

    source = "thetopo"

    def __init__(
        self,
        client: TheTopoClient | None = None,
        parser: TheTopoParser | None = None,
    ) -> None:
        """Create a TheTopo importer."""

        self.client = client if client is not None else TheTopoClient()
        self.parser = parser if parser is not None else TheTopoParser()

    def preview(self, username: str) -> ImportPreview:
        """Return public boulder ascents for one TheTopo username."""

        html = self.client.get_boulder_ascents_html(username)
        boulders, skipped_count = self.parser.parse_boulder_ascents(html)
        boulders = [replace(boulder, climber=username) for boulder in boulders]
        return ImportPreview(
            source=self.source,
            username=username,
            boulders=boulders,
            skipped_count=skipped_count,
        )
