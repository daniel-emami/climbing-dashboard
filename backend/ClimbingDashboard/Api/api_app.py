from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from ClimbingDashboard.Api.api_router import router
from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Api.import_service import ImportService
from ClimbingDashboard.Config.app_settings import AppSettings

logger = logging.getLogger(__name__)


def create_app(database_path: str | Path | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""

    settings = AppSettings()
    selected_database_path = (
        Path(database_path) if database_path is not None else settings.default_database_path
    )
    settings.uploads_path.mkdir(parents=True, exist_ok=True)
    app = FastAPI(title=settings.app_name)
    app.state.api_service = ApiService(
        database_path=selected_database_path,
        uploads_path=settings.uploads_path,
        max_video_upload_bytes=settings.max_video_upload_bytes,
    )
    app.state.import_service = ImportService(database_path=selected_database_path)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_cors_origins,
        allow_origin_regex=settings.local_frontend_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    app.mount("/uploads", StaticFiles(directory=settings.uploads_path), name="uploads")
    logger.info("API application created with SQLite path %s", selected_database_path)

    @app.get("/")
    def root() -> dict[str, object]:
        """Return a short index of the most useful backend routes."""

        return {
            "app": settings.app_name,
            "routes": {
                "health": "/health",
                "boulders": "/api/boulders",
                "import_preview": "/api/imports/{source}/preview",
                "import_confirm": "/api/imports/{source}/confirm",
                "export_boulders": "/api/exports/boulders",
                "uploads": "/uploads",
                "docs": "/docs",
            },
        }

    @app.get("/health")
    def health_check() -> dict[str, str]:
        """Return a simple health check payload."""

        return {"status": "ok"}

    return app


app = create_app()
