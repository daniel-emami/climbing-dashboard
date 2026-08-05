from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import StreamingResponse

from ClimbingDashboard.Api.api_models import (
    AscentCommentCreateRequest,
    AscentCommentUpdateRequest,
    BoulderCommentCreateRequest,
    BoulderCommentUpdateRequest,
    BoulderCreateRequest,
)
from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Api.boulder_payload_mapper import BoulderPayloadMapper
from ClimbingDashboard.Api.import_service import ImportService
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Storage.excel_exporter import ExcelBoulderExporter

router = APIRouter()
JSON_BODY = Body(...)
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
    payload: dict[str, Any] = JSON_BODY,
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
    payload: dict[str, Any] = JSON_BODY,
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
        original_sector = str(original.get("sector", "")).strip()
        original_climber = str(original.get("climber", "")).strip()
        if not original_name or not original_area:
            raise ValueError("original name and area are required")
        return get_api_service(request).update_boulder(
            original_name=original_name,
            original_area=original_area,
            original_sector=original_sector,
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
    payload: dict[str, Any] = JSON_BODY,
) -> dict[str, object]:
    """Delete a climbed boulder from the database."""

    try:
        name = str(payload.get("name", "")).strip()
        area = str(payload.get("area", "")).strip()
        sector = str(payload.get("sector", "")).strip()
        climber = str(payload.get("climber", "")).strip()
        if not name or not area:
            raise ValueError("name and area are required")
        return get_api_service(request).delete_boulder(name, area, sector, climber)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api/boulders/comments")
def get_boulder_comments(
    request: Request,
    name: str,
    area: str,
    sector: str = "",
) -> dict[str, object]:
    """Return public comments for one boulder problem."""

    try:
        clean_name = name.strip()
        clean_area = area.strip()
        clean_sector = sector.strip()
        if not clean_name or not clean_area:
            raise ValueError("name and area are required")
        return get_api_service(request).get_boulder_comments(
            clean_name,
            clean_area,
            clean_sector,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/boulders/comments")
def add_boulder_comment(
    request: Request,
    payload: dict[str, Any] = JSON_BODY,
) -> dict[str, object]:
    """Append a public comment to one boulder problem."""

    try:
        comment = BoulderCommentCreateRequest.from_payload(payload)
        return get_api_service(request).save_boulder_comment(comment)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/api/boulders/comments/{comment_id}")
def update_boulder_comment(
    comment_id: int,
    request: Request,
    payload: dict[str, Any] = JSON_BODY,
) -> dict[str, object]:
    """Update a public boulder comment."""

    try:
        comment = BoulderCommentUpdateRequest.from_payload(payload)
        return get_api_service(request).update_boulder_comment(comment_id, comment)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/api/boulders/comments/{comment_id}")
def delete_boulder_comment(comment_id: int, request: Request) -> dict[str, object]:
    """Soft-delete a public boulder comment."""

    try:
        return get_api_service(request).delete_boulder_comment(comment_id)
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api/ascents/{ascent_id}/comments")
def get_ascent_comments(ascent_id: int, request: Request) -> dict[str, object]:
    """Return public comments for one ascent."""

    try:
        return get_api_service(request).get_ascent_comments(ascent_id)
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api/ascents/comments")
def get_ascent_comments_batch(
    request: Request,
    ascent_ids: str = "",
) -> dict[str, object]:
    """Return public comments grouped by ascent id."""

    try:
        clean_ascent_ids = _ascent_ids_from_query(ascent_ids)
        return get_api_service(request).get_ascent_comments_for_ascent_ids(clean_ascent_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/ascents/comments")
def add_ascent_comment(
    request: Request,
    payload: dict[str, Any] = JSON_BODY,
) -> dict[str, object]:
    """Append a public comment to one ascent."""

    try:
        comment = AscentCommentCreateRequest.from_payload(payload)
        return get_api_service(request).save_ascent_comment(comment)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/api/ascents/comments/{comment_id}")
def update_ascent_comment(
    comment_id: int,
    request: Request,
    payload: dict[str, Any] = JSON_BODY,
) -> dict[str, object]:
    """Update a public ascent comment."""

    try:
        comment = AscentCommentUpdateRequest.from_payload(payload)
        return get_api_service(request).update_ascent_comment(comment_id, comment)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/api/ascents/comments/{comment_id}")
def delete_ascent_comment(comment_id: int, request: Request) -> dict[str, object]:
    """Soft-delete a public ascent comment."""

    try:
        return get_api_service(request).delete_ascent_comment(comment_id)
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _ascent_ids_from_query(value: str) -> list[int]:
    ascent_ids: list[int] = []
    for raw_ascent_id in value.split(","):
        text = raw_ascent_id.strip()
        if not text:
            continue
        try:
            ascent_id = int(text)
        except ValueError as exc:
            raise ValueError("ascent_ids must be comma-separated positive integers") from exc
        if ascent_id <= 0:
            raise ValueError("ascent_ids must be comma-separated positive integers")
        ascent_ids.append(ascent_id)
    return ascent_ids


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
def export_boulders(payload: dict[str, Any] = JSON_BODY) -> StreamingResponse:
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
