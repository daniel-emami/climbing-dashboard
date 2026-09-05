from pathlib import Path

from ClimbingDashboard.Api.api_models import (
    AscentCommentCreateRequest,
    BoulderCommentCreateRequest,
    BoulderCreateRequest,
)
from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Api.auth_models import SignupRequest
from ClimbingDashboard.Api.auth_service import AuthService
from ClimbingDashboard.Models.stored_media_file import StoredMediaFile


def test_display_name_is_public_while_username_remains_identity(tmp_path: Path) -> None:
    database_path = tmp_path / "dashboard.db"
    session = AuthService(database_path, "invite", 7).signup(
        SignupRequest("alfredben", "password123", "invite", "benzen")
    )
    service = ApiService(database_path)

    dashboard = service.save_boulder(
        BoulderCreateRequest(
            name="Test Boulder",
            grade_27crags="6a",
            guide_grade="6a",
            own_grade="6a",
            area="Test Area",
            sector="",
            climber="ignored-client-value",
        ),
        session.user,
    )
    ascent = dashboard["records"][0]
    _assert_identity(ascent)

    boulder_comment = service.save_boulder_comment(
        BoulderCommentCreateRequest("Test Boulder", "Test Area", "", "Useful beta"),
        session.user,
    )["comments"][0]
    _assert_identity(boulder_comment)

    ascent_comment = service.save_ascent_comment(
        AscentCommentCreateRequest(ascent["ascent_id"], "Nice send"),
        session.user,
    )["comments"][0]
    _assert_identity(ascent_comment)

    service.storage.append_boulder_media(
        "Test Boulder",
        "Test Area",
        "",
        int(ascent["ascent_id"]),
        "alfredben",
        "Beta",
        StoredMediaFile("videos/test.mp4", "test.mp4", "video/mp4", 10),
    )
    media = service.get_boulder_media("Test Boulder", "Test Area", "")["media"][0]
    _assert_identity(media)


def test_api_service_can_initialize_before_auth_service(tmp_path: Path) -> None:
    service = ApiService(tmp_path / "dashboard.db")

    assert service.get_boulders()["records"] == []


def _assert_identity(payload: dict[str, object]) -> None:
    assert payload["climber"] == "alfredben"
    assert payload["climber_display_name"] == "benzen"
