from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request

from ClimbingDashboard.Api.api_models import BoulderCreateRequest
from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Api.import_service import ImportService
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.excel_storage_error import ExcelStorageError
from ClimbingDashboard.Import.imported_ascent import ImportedAscent

router = APIRouter()
BOULDER_BODY = Body(...)
IMPORT_BODY = Body(...)


def get_api_service(request: Request) -> ApiService:
    """Return the configured API service from FastAPI application state."""

    return request.app.state.api_service


def get_import_service(request: Request) -> ImportService:
    """Return the configured import service from FastAPI application state."""

    return request.app.state.import_service


@router.get("/api/boulders")
def get_boulders(request: Request) -> dict[str, object]:
    """Return climbed boulders and dashboard statistics."""

    try:
        return get_api_service(request).get_boulders()
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/boulders")
def add_boulder(
    request: Request,
    payload: dict[str, Any] = BOULDER_BODY,
) -> dict[str, object]:
    """Append a climbed boulder to the workbook."""

    try:
        boulder = BoulderCreateRequest.from_payload(payload)
        return get_api_service(request).add_boulder(boulder)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/imports/{source}/preview")
def preview_import(
    source: str,
    request: Request,
    payload: dict[str, Any] = IMPORT_BODY,
) -> dict[str, object]:
    """Preview boulder ascents from a supported external source."""

    try:
        username = str(payload.get("username", "")).strip()
        return get_import_service(request).preview_import(source, username).to_payload()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/imports/{source}/confirm")
def confirm_import(
    source: str,
    request: Request,
    payload: dict[str, Any] = IMPORT_BODY,
) -> dict[str, object]:
    """Save selected imported boulder ascents from a supported external source."""

    try:
        if source.strip().lower() != str(payload.get("source", source)).strip().lower():
            raise ValueError("Import source in URL and payload must match")
        get_import_service(request).ensure_supported_source(source)
        ascents_payload = payload.get("ascents", [])
        if not isinstance(ascents_payload, list):
            raise ValueError("ascents must be a list")
        ascents = [
            ImportedAscent.from_payload(ascent)
            for ascent in ascents_payload
            if isinstance(ascent, dict)
        ]
        return get_import_service(request).confirm_import(ascents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ExcelStorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
