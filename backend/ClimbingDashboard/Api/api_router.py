from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import StreamingResponse

from ClimbingDashboard.Api.api_models import BoulderCreateRequest
from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Api.boulder_payload_mapper import BoulderPayloadMapper
from ClimbingDashboard.Api.import_service import ImportService
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Storage.excel_exporter import ExcelBoulderExporter

router = APIRouter()
BOULDER_BODY = Body(...)
IMPORT_BODY = Body(...)
BOULDER_PAYLOAD_MAPPER = BoulderPayloadMapper()
EXCEL_BOULDER_EXPORTER = ExcelBoulderExporter()


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
    """Append a climbed boulder to the database."""

    try:
        boulder = BoulderCreateRequest.from_payload(payload)
        return get_api_service(request).save_boulder(boulder)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/api/boulders")
def update_boulder(
    request: Request,
    payload: dict[str, Any] = BOULDER_BODY,
) -> dict[str, object]:
    """Update a climbed boulder in the database."""

    try:
        original = payload.get("original", {})
        if not isinstance(original, dict):
            raise ValueError("original must be an object")
        boulder_payload = payload.get("boulder", {})
        if not isinstance(boulder_payload, dict):
            raise ValueError("boulder must be an object")
        boulder = BoulderCreateRequest.from_payload(boulder_payload)
        original_name = str(original.get("name", "")).strip()
        original_area = str(original.get("area", "")).strip()
        original_climber = str(original.get("climber", "")).strip()
        if not original_name or not original_area:
            raise ValueError("original name and area are required")
        return get_api_service(request).update_boulder(
            original_name=original_name,
            original_area=original_area,
            original_climber=original_climber,
            request=boulder,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/api/boulders")
def delete_boulder(
    request: Request,
    payload: dict[str, Any] = BOULDER_BODY,
) -> dict[str, object]:
    """Delete a climbed boulder from the database."""

    try:
        name = str(payload.get("name", "")).strip()
        area = str(payload.get("area", "")).strip()
        climber = str(payload.get("climber", "")).strip()
        if not name or not area:
            raise ValueError("name and area are required")
        return get_api_service(request).delete_boulder(name, area, climber)
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
        boulders_payload = payload.get("boulders", [])
        if not isinstance(boulders_payload, list):
            raise ValueError("boulders must be a list")
        boulders = BOULDER_PAYLOAD_MAPPER.boulders_from_payloads(boulders_payload)
        return get_import_service(request).confirm_import(boulders)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except StorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/exports/boulders")
def export_boulders(payload: dict[str, Any] = BOULDER_BODY) -> StreamingResponse:
    """Export supplied boulder rows to an Excel workbook."""

    try:
        boulders_payload = payload.get("boulders", [])
        if not isinstance(boulders_payload, list):
            raise ValueError("boulders must be a list")
        boulders = BOULDER_PAYLOAD_MAPPER.boulders_from_payloads(boulders_payload)
        stream = EXCEL_BOULDER_EXPORTER.build_workbook(boulders)
        return StreamingResponse(
            stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": 'attachment; filename="climbing-dashboard-export.xlsx"'
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
