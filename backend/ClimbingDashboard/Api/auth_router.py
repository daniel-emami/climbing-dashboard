from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request, Response

from ClimbingDashboard.Api.auth_dependencies import (
    current_user_from_request,
    get_auth_service,
)
from ClimbingDashboard.Api.auth_models import LoginRequest, SignupRequest
from ClimbingDashboard.Exceptions.auth_error import AuthError
from ClimbingDashboard.Models.auth_session import AuthSession

router = APIRouter()
AUTH_BODY = Body(...)


@router.get("/api/auth/me")
def get_current_auth_user(request: Request, response: Response) -> dict[str, object]:
    """Return the current browser session user, if one exists."""

    user = current_user_from_request(request)
    if user is None:
        _clear_session_cookie(request, response)
        return {"user": None}
    return {"user": user.to_payload()}


@router.post("/api/auth/signup")
def signup(
    request: Request,
    response: Response,
    payload: dict[str, Any] = AUTH_BODY,
) -> dict[str, object]:
    """Create an invite-gated user account and sign the browser in."""

    try:
        auth_session = get_auth_service(request).signup(SignupRequest.from_payload(payload))
        _set_session_cookie(request, response, auth_session)
        return {"user": auth_session.user.to_payload()}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.post("/api/auth/login")
def login(
    request: Request,
    response: Response,
    payload: dict[str, Any] = AUTH_BODY,
) -> dict[str, object]:
    """Create a browser session for an existing user."""

    try:
        auth_session = get_auth_service(request).login(LoginRequest.from_payload(payload))
        _set_session_cookie(request, response, auth_session)
        return {"user": auth_session.user.to_payload()}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.post("/api/auth/logout")
def logout(request: Request, response: Response) -> dict[str, object]:
    """Revoke the current browser session."""

    settings = request.app.state.settings
    session_token = request.cookies.get(settings.session_cookie_name)
    try:
        get_auth_service(request).logout(session_token)
        _clear_session_cookie(request, response)
        return {"user": None}
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


def _set_session_cookie(
    request: Request,
    response: Response,
    auth_session: AuthSession,
) -> None:
    settings = request.app.state.settings
    response.set_cookie(
        key=settings.session_cookie_name,
        value=auth_session.token,
        max_age=settings.session_cookie_max_age_seconds,
        httponly=True,
        secure=settings.secure_auth_cookies,
        samesite="lax",
        path="/",
    )


def _clear_session_cookie(request: Request, response: Response) -> None:
    settings = request.app.state.settings
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        secure=settings.secure_auth_cookies,
        httponly=True,
        samesite="lax",
    )
