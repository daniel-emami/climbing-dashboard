from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request

from ClimbingDashboard.Api.api_models import BoulderCreateRequest
from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Api.import_service import ImportService
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.excel_storage_error import ExcelStorageError
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Utilities.date_utils import parse_excel_date

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
        return get_api_service(request).save_boulder(boulder)
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
        boulders = [
            _boulder_from_payload(boulder)
            for boulder in boulders_payload
            if isinstance(boulder, dict)
        ]
        return get_import_service(request).confirm_import(boulders)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ExcelStorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _boulder_from_payload(payload: dict[str, Any]) -> BoulderRecord:
    return BoulderRecord(
        name=str(payload.get("name", "")).strip(),
        grade_27crags=str(payload.get("grade_27crags", "")).strip(),
        guide_grade=str(payload.get("guide_grade", "")).strip(),
        my_grade=str(payload.get("my_grade", "")).strip(),
        area=str(payload.get("area", "")).strip(),
        flash=bool(payload.get("flash", False)),
        climbed_on=parse_excel_date(payload.get("climbed_on")),
    )
