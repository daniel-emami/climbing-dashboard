from __future__ import annotations

from fastapi import HTTPException, Request

from ClimbingDashboard.Api.auth_service import AuthService
from ClimbingDashboard.Exceptions.auth_error import AuthError
from ClimbingDashboard.Models.user_account import UserAccount


def get_auth_service(request: Request) -> AuthService:
    """Return the configured auth service from FastAPI application state."""

    return request.app.state.auth_service


def current_user_from_request(request: Request) -> UserAccount | None:
    """Return the logged-in user for the incoming request, if any."""

    settings = request.app.state.settings
    session_token = request.cookies.get(settings.session_cookie_name)
    try:
        return get_auth_service(request).current_user(session_token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


def require_current_user(request: Request) -> UserAccount:
    """Return the logged-in user or raise a 401 response."""

    user = current_user_from_request(request)
    if user is None:
        raise HTTPException(status_code=401, detail="You must be logged in")
    return user
