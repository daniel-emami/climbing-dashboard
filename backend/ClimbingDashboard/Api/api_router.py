from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse

from ClimbingDashboard.Api.api_models import (
    AscentCommentCreateRequest,
    AscentCommentUpdateRequest,
    BoulderCommentCreateRequest,
    BoulderCommentUpdateRequest,
    BoulderCreateRequest,
    BoulderMediaUploadRequest,
)
from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Api.auth_dependencies import (
    current_user_from_request,
    require_current_user,
)
from ClimbingDashboard.Api.boulder_payload_mapper import BoulderPayloadMapper
from ClimbingDashboard.Api.import_service import ImportService
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Storage.excel_exporter import ExcelBoulderExporter

router = APIRouter()
JSON_BODY = Body(...)
MEDIA_NAME_FORM = Form(...)
MEDIA_AREA_FORM = Form(...)
MEDIA_SECTOR_FORM = Form("")
MEDIA_CLIMBER_FORM = Form(...)
MEDIA_CAPTION_FORM = Form("")
MEDIA_FILE = File(...)
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
        current_user = current_user_from_request(request)
        return get_api_service(request).get_boulders(current_user)
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/boulders")
def add_boulder(
    request: Request,
    payload: dict[str, Any] = JSON_BODY,
) -> dict[str, object]:
    """Append a climbed boulder to the database."""

    try:
        current_user = require_current_user(request)
        boulder = BoulderCreateRequest.from_payload(payload)
        return get_api_service(request).save_boulder(boulder, current_user)
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
        current_user = require_current_user(request)
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
        original_climber = str(original.get("climber", current_user.username)).strip()
        if not original_name or not original_area:
            raise ValueError("original name and area are required")
        return get_api_service(request).update_boulder(
            original_name=original_name,
            original_area=original_area,
            original_sector=original_sector,
            original_climber=original_climber,
            request=boulder,
            current_user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/api/boulders")
def delete_boulder(
    request: Request,
    payload: dict[str, Any] = JSON_BODY,
) -> dict[str, object]:
    """Delete a climbed boulder from the database."""

    try:
        current_user = require_current_user(request)
        name = str(payload.get("name", "")).strip()
        area = str(payload.get("area", "")).strip()
        sector = str(payload.get("sector", "")).strip()
        climber = str(payload.get("climber", current_user.username)).strip()
        if not name or not area:
            raise ValueError("name and area are required")
        return get_api_service(request).delete_boulder(
            name,
            area,
            sector,
            climber,
            current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
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
        current_user = require_current_user(request)
        comment = BoulderCommentCreateRequest.from_payload(payload)
        return get_api_service(request).save_boulder_comment(comment, current_user)
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
        current_user = require_current_user(request)
        comment = BoulderCommentUpdateRequest.from_payload(payload)
        return get_api_service(request).update_boulder_comment(
            comment_id,
            comment,
            current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/api/boulders/comments/{comment_id}")
def delete_boulder_comment(comment_id: int, request: Request) -> dict[str, object]:
    """Soft-delete a public boulder comment."""

    try:
        current_user = require_current_user(request)
        return get_api_service(request).delete_boulder_comment(comment_id, current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api/boulders/media")
def get_boulder_media(
    request: Request,
    name: str,
    area: str,
    sector: str = "",
) -> dict[str, object]:
    """Return uploaded media for one boulder problem."""

    try:
        clean_name = name.strip()
        clean_area = area.strip()
        clean_sector = sector.strip()
        if not clean_name or not clean_area:
            raise ValueError("name and area are required")
        return get_api_service(request).get_boulder_media(
            clean_name,
            clean_area,
            clean_sector,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api/boulders/media/recent")
def get_recent_boulder_media(request: Request, limit: int = 30) -> dict[str, object]:
    """Return recent uploaded media across all boulder problems."""

    try:
        if limit < 1:
            raise ValueError("limit must be a positive integer")
        return get_api_service(request).get_recent_boulder_media(limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/boulders/media")
def add_boulder_media(
    request: Request,
    name: str = MEDIA_NAME_FORM,
    area: str = MEDIA_AREA_FORM,
    sector: str = MEDIA_SECTOR_FORM,
    climber: str = MEDIA_CLIMBER_FORM,
    caption: str = MEDIA_CAPTION_FORM,
    file: UploadFile = MEDIA_FILE,
) -> dict[str, object]:
    """Upload one video and attach it to a boulder problem."""

    try:
        media_request = BoulderMediaUploadRequest(
            name=name,
            area=area,
            sector=sector,
            ascent_id="",
            climber=climber,
            caption=caption,
        )
        file.file.seek(0)
        return get_api_service(request).save_boulder_video(
            media_request,
            file.file,
            file.filename or "",
            file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/api/boulders/media/{media_id}")
def delete_boulder_media(media_id: int, request: Request) -> dict[str, object]:
    """Soft-delete one uploaded media item."""

    try:
        return get_api_service(request).delete_boulder_media(media_id)
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
        current_user = require_current_user(request)
        comment = AscentCommentCreateRequest.from_payload(payload)
        return get_api_service(request).save_ascent_comment(comment, current_user)
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
        current_user = require_current_user(request)
        comment = AscentCommentUpdateRequest.from_payload(payload)
        return get_api_service(request).update_ascent_comment(
            comment_id,
            comment,
            current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/api/ascents/comments/{comment_id}")
def delete_ascent_comment(comment_id: int, request: Request) -> dict[str, object]:
    """Soft-delete a public ascent comment."""

    try:
        current_user = require_current_user(request)
        return get_api_service(request).delete_ascent_comment(comment_id, current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
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
        current_user = require_current_user(request)
        if source.strip().lower() != str(payload.get("source", source)).strip().lower():
            raise ValueError("Import source in URL and payload must match")
        get_import_service(request).ensure_supported_source(source)
        boulders_payload = payload.get("boulders", [])
        if not isinstance(boulders_payload, list):
            raise ValueError("boulders must be a list")
        boulders = BOULDER_PAYLOAD_MAPPER.boulders_from_payloads(boulders_payload)
        return get_import_service(request).confirm_import(boulders, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ApiDataError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
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
