from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request

from ClimbingDashboard.Api.api_models import BoulderCreateRequest
from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError

router = APIRouter()
BOULDER_BODY = Body(...)


def get_api_service(request: Request) -> ApiService:
    """Return the configured API service from FastAPI application state."""

    return request.app.state.api_service


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
