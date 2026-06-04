from __future__ import annotations

from pathlib import Path

from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Import.import_preview import ImportPreview
from ClimbingDashboard.Import.imported_ascent import ImportedAscent
from ClimbingDashboard.Import.importer_factory import AscentsImporterFactory
from ClimbingDashboard.Storage.excel_storage import ExcelStorage


class ImportService:
    """Coordinates external boulder ascent imports."""

    def __init__(
        self,
        excel_path: str | Path,
        importer_factory: AscentsImporterFactory | None = None,
    ) -> None:
        """Create the import service."""

        self.storage = ExcelStorage(excel_path)
        self.api_service = ApiService(excel_path)
        self.importer_factory = (
            importer_factory if importer_factory is not None else AscentsImporterFactory()
        )

    def preview_import(self, source: str, username: str) -> ImportPreview:
        """Preview boulder ascents from an external source."""

        clean_username = username.strip()
        if not clean_username:
            raise ValueError("username is required")
        importer = self.importer_factory.get_importer(source)
        return importer.preview(clean_username)

    def confirm_import(self, ascents: list[ImportedAscent]) -> dict[str, object]:
        """Save selected imported boulder ascents and return refreshed dashboard data."""

        self.storage.append_boulders([ascent.to_boulder_record() for ascent in ascents])
        return self.api_service.get_boulders()

    def ensure_supported_source(self, source: str) -> None:
        """Raise when an import source is not supported."""

        self.importer_factory.get_importer(source)
