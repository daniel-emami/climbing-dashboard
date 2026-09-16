from io import BytesIO
from pathlib import Path

import pytest

from ClimbingDashboard.Api.api_models import BoulderCreateRequest, BoulderMediaUploadRequest
from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Api.auth_models import SignupRequest
from ClimbingDashboard.Api.auth_service import AuthService
from ClimbingDashboard.Models.user_account import UserAccount
from ClimbingDashboard.Storage.base_video_transcoder import BaseVideoTranscoder


class FakeVideoTranscoder(BaseVideoTranscoder):
    def transcode_to_mp4(self, source_path: Path, target_path: Path) -> None:
        assert source_path.read_bytes() == b"video-content"
        target_path.write_bytes(b"optimized-video-content")


def test_video_inherits_ascent_visibility_and_requires_owner_for_deletion(
    tmp_path: Path,
) -> None:
    database_path = tmp_path / "dashboard.db"
    uploads_path = tmp_path / "uploads"
    auth_service = AuthService(database_path, "invite", 7)
    public_user = auth_service.signup(
        SignupRequest("public-user", "password123", "invite")
    ).user
    private_user = auth_service.signup(
        SignupRequest("private-user", "password123", "invite")
    ).user
    service = ApiService(
        database_path,
        uploads_path=uploads_path,
        video_transcoder=FakeVideoTranscoder(),
    )

    _save_ascent(service, public_user, "public")
    _save_ascent(service, private_user, "private")
    public_media = _save_video(service, public_user, "public.mp4")["media"][0]
    private_media = _save_video(service, private_user, "private.mp4")["media"][0]
    assert public_media["mime_type"] == "video/mp4"
    assert public_media["file_size"] == len(b"optimized-video-content")

    anonymous_media = service.get_boulder_media("Shared Boulder", "Test Area", "")["media"]
    assert [item["id"] for item in anonymous_media] == [public_media["id"]]
    anonymous_feed_media = service.get_recent_boulder_media()["media"]
    assert [item["id"] for item in anonymous_feed_media] == [public_media["id"]]

    public_user_media = service.get_boulder_media(
        "Shared Boulder", "Test Area", "", public_user
    )["media"]
    assert [item["id"] for item in public_user_media] == [public_media["id"]]

    private_user_media = service.get_boulder_media(
        "Shared Boulder", "Test Area", "", private_user
    )["media"]
    assert {item["id"] for item in private_user_media} == {
        public_media["id"],
        private_media["id"],
    }
    assert next(
        item for item in private_user_media if item["id"] == private_media["id"]
    )["visibility"] == "private"
    private_feed_media = service.get_recent_boulder_media(current_user=private_user)["media"]
    assert {item["id"] for item in private_feed_media} == {
        public_media["id"],
        private_media["id"],
    }

    service.update_boulder(
        "Shared Boulder",
        "Test Area",
        "",
        private_user.username,
        _boulder_request("public"),
        private_user,
    )
    now_public_media = service.get_boulder_media("Shared Boulder", "Test Area", "")["media"]
    assert {item["id"] for item in now_public_media} == {
        public_media["id"],
        private_media["id"],
    }
    service.update_boulder(
        "Shared Boulder",
        "Test Area",
        "",
        private_user.username,
        _boulder_request("private"),
        private_user,
    )

    public_file = service.get_boulder_video_file(int(public_media["id"]))
    assert public_file.path.read_bytes() == b"optimized-video-content"
    with pytest.raises(PermissionError, match="access"):
        service.get_boulder_video_file(int(private_media["id"]))
    with pytest.raises(PermissionError, match="own videos"):
        service.delete_boulder_media(int(private_media["id"]), public_user)

    private_file = service.get_boulder_video_file(int(private_media["id"]), private_user)
    assert private_file.path.read_bytes() == b"optimized-video-content"
    service.delete_boulder_media(int(private_media["id"]), private_user)
    assert not private_file.path.exists()


def _save_ascent(service: ApiService, user: UserAccount, visibility: str) -> None:
    service.save_boulder(_boulder_request(visibility), user)


def _boulder_request(visibility: str) -> BoulderCreateRequest:
    return BoulderCreateRequest(
        name="Shared Boulder",
        grade_27crags="6a",
        guide_grade="6a",
        own_grade="6a",
        area="Test Area",
        sector="",
        climber="ignored",
        visibility=visibility,
    )


def _save_video(
    service: ApiService,
    user: UserAccount,
    filename: str,
) -> dict[str, object]:
    return service.save_boulder_video(
        BoulderMediaUploadRequest("Shared Boulder", "Test Area", "", "Beta"),
        BytesIO(b"video-content"),
        filename,
        "video/mp4",
        user,
    )
