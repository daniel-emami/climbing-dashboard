from pathlib import Path

import pytest

from ClimbingDashboard.Api.auth_models import (
    AdminPasswordResetRequest,
    LoginRequest,
    SignupRequest,
)
from ClimbingDashboard.Api.auth_service import AuthService
from ClimbingDashboard.Exceptions.auth_error import AuthError


def test_admin_can_generate_replacement_password_and_revoke_sessions(
    tmp_path: Path,
) -> None:
    auth_service = AuthService(
        tmp_path / "dashboard.db",
        "invite",
        7,
        admin_usernames=["daniel_emami"],
    )
    admin_session = auth_service.signup(
        SignupRequest("daniel_emami", "admin-password", "invite")
    )
    friend_session = auth_service.signup(
        SignupRequest("climbing-friend", "old-password", "invite", "Climbing Friend")
    )

    result = auth_service.reset_user_password(
        AdminPasswordResetRequest("climbing-friend"),
        admin_session.user,
    )

    assert result.username == "climbing-friend"
    assert result.display_name == "Climbing Friend"
    assert [len(group) for group in result.temporary_password.split("-")] == [4, 4, 4, 4]
    assert auth_service.current_user(friend_session.token) is None

    with pytest.raises(AuthError) as old_password_error:
        auth_service.login(LoginRequest("climbing-friend", "old-password"))
    assert old_password_error.value.status_code == 401

    replacement_session = auth_service.login(
        LoginRequest("climbing-friend", result.temporary_password)
    )
    assert replacement_session.user.username == "climbing-friend"
    credentials = auth_service.storage.read_user_credentials("climbing-friend")
    assert credentials is not None
    assert credentials.password_hash != result.temporary_password


def test_non_admin_cannot_reset_a_password(tmp_path: Path) -> None:
    auth_service = AuthService(
        tmp_path / "dashboard.db",
        "invite",
        7,
        admin_usernames=["daniel_emami"],
    )
    user = auth_service.signup(
        SignupRequest("ordinary-user", "password123", "invite")
    ).user

    with pytest.raises(AuthError) as reset_error:
        auth_service.reset_user_password(AdminPasswordResetRequest("ordinary-user"), user)

    assert reset_error.value.status_code == 403


def test_admin_gets_not_found_for_unknown_username(tmp_path: Path) -> None:
    auth_service = AuthService(
        tmp_path / "dashboard.db",
        "invite",
        7,
        admin_usernames=["daniel_emami"],
    )
    admin = auth_service.signup(
        SignupRequest("daniel_emami", "admin-password", "invite")
    ).user

    with pytest.raises(AuthError) as reset_error:
        auth_service.reset_user_password(AdminPasswordResetRequest("missing-user"), admin)

    assert reset_error.value.status_code == 404
