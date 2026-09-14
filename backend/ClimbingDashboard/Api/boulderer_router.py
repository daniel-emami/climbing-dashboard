from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from ClimbingDashboard.Api.auth_dependencies import (
    current_user_from_request,
    require_current_user,
)
from ClimbingDashboard.Api.boulderer_service import BouldererService
from ClimbingDashboard.Api.profile_models import ProfileUpdateRequest
from ClimbingDashboard.Exceptions.profile_error import ProfileError

router = APIRouter()
PROFILE_BODY = Body(...)
PROFILE_PICTURE = File(...)


def get_boulderer_service(request: Request) -> BouldererService:
    return request.app.state.boulderer_service


@router.get("/api/boulderers/{username}")
def get_boulderer_profile(username: str, request: Request) -> dict[str, object]:
    """Return one boulderer profile with viewer-appropriate activity."""

    try:
        return get_boulderer_service(request).get_profile(
            username,
            current_user_from_request(request),
        )
    except ProfileError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.put("/api/boulderers/{username}")
def update_boulderer_profile(
    username: str,
    request: Request,
    payload: dict[str, Any] = PROFILE_BODY,
) -> dict[str, object]:
    """Update the logged-in user's own profile text fields."""

    try:
        return get_boulderer_service(request).update_profile(
            username,
            ProfileUpdateRequest.from_payload(payload),
            require_current_user(request),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ProfileError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.post("/api/boulderers/{username}/profile-picture")
def upload_boulderer_profile_picture(
    username: str,
    request: Request,
    file: UploadFile = PROFILE_PICTURE,
) -> dict[str, object]:
    """Replace the logged-in user's profile picture."""

    try:
        file.file.seek(0)
        return get_boulderer_service(request).save_profile_picture(
            username,
            file.file,
            file.filename or "",
            file.content_type,
            require_current_user(request),
        )
    except ProfileError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.get(
    "/api/boulderers/{username}/profile-picture",
    response_class=FileResponse,
)
def get_boulderer_profile_picture(username: str, request: Request) -> FileResponse:
    """Serve one public profile picture."""

    try:
        picture = get_boulderer_service(request).get_profile_picture(username)
        return FileResponse(
            picture.path,
            media_type=picture.mime_type,
            headers={"Cache-Control": "no-store"},
        )
    except ProfileError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
