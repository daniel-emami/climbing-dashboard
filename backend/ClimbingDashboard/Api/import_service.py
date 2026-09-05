from __future__ import annotations

from dataclasses import replace
from pathlib import Path

from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Import.import_preview import ImportPreview
from ClimbingDashboard.Import.importer_factory import AscentsImporterFactory
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Storage.sqlite_storage import SqliteStorage
from ClimbingDashboard.Utilities.location_normalizer import LocationNormalizer


class ImportService:
    """Coordinates external boulder ascent imports."""

    def __init__(
        self,
        database_path: str | Path,
        importer_factory: AscentsImporterFactory | None = None,
        location_normalizer: LocationNormalizer | None = None,
    ) -> None:
        """Create the import service."""

        self.storage = SqliteStorage(database_path)
        self.location_normalizer = (
            location_normalizer if location_normalizer is not None else LocationNormalizer()
        )
        self.api_service = ApiService(database_path, self.location_normalizer)
        self.importer_factory = (
            importer_factory if importer_factory is not None else AscentsImporterFactory()
        )

    def preview_import(self, source: str, username: str) -> ImportPreview:
        """Preview boulder ascents from an external source."""

        clean_username = username.strip()
        if not clean_username:
            raise ValueError("username is required")
        importer = self.importer_factory.get_importer(source)
        preview = importer.preview(clean_username)
        return replace(
            preview,
            boulders=[
                self.location_normalizer.normalize_record(boulder)
                for boulder in preview.boulders
            ],
        )

    def confirm_import(self, boulders: list[BoulderRecord]) -> dict[str, object]:
        """Save selected imported boulder ascents and return refreshed dashboard data."""

        normalized_boulders = [
            self.location_normalizer.normalize_record(boulder)
            for boulder in boulders
        ]
        self.storage.append_boulders(normalized_boulders)
        return self.api_service.get_boulders()

    def ensure_supported_source(self, source: str) -> None:
        """Raise when an import source is not supported."""

        self.importer_factory.get_importer(source)
