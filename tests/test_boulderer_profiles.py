from io import BytesIO
from pathlib import Path

import pytest

from ClimbingDashboard.Api.api_models import BoulderCreateRequest, BoulderMediaUploadRequest
from ClimbingDashboard.Api.api_service import ApiService
from ClimbingDashboard.Api.auth_models import SignupRequest
from ClimbingDashboard.Api.auth_service import AuthService
from ClimbingDashboard.Api.boulderer_service import BouldererService
from ClimbingDashboard.Api.profile_models import ProfileUpdateRequest
from ClimbingDashboard.Exceptions.profile_error import ProfileError
from ClimbingDashboard.Storage.base_video_transcoder import BaseVideoTranscoder


class FakeVideoTranscoder(BaseVideoTranscoder):
    def transcode_to_mp4(self, source_path: Path, target_path: Path) -> None:
        assert source_path.read_bytes()
        target_path.write_bytes(b"optimized-video-content")


def test_profile_respects_ascent_privacy_and_calculates_stats(tmp_path: Path) -> None:
    database_path = tmp_path / "dashboard.db"
    auth = AuthService(database_path, "invite", 7)
    owner = auth.signup(SignupRequest("owner", "password123", "invite", "Old Name")).user
    viewer = auth.signup(SignupRequest("viewer", "password123", "invite")).user
    api = ApiService(
        database_path,
        uploads_path=tmp_path / "uploads",
        video_transcoder=FakeVideoTranscoder(),
    )
    api.save_boulder(_boulder("Public Send", "7a", "Rocklands", "public", 5), owner)
    api.save_boulder(_boulder("Private Send", "7b", "Rocklands", "private", 4), owner)
    api.save_boulder(_boulder("Someone Else", "8a", "Kjugekull", "public", 3), viewer)
    api.save_boulder_video(
        BoulderMediaUploadRequest("Public Send", "Rocklands", "", "Public beta"),
        BytesIO(b"public-video"),
        "public.mp4",
        "video/mp4",
        owner,
    )
    api.save_boulder_video(
        BoulderMediaUploadRequest("Private Send", "Rocklands", "", "Private beta"),
        BytesIO(b"private-video"),
        "private.mp4",
        "video/mp4",
        owner,
    )
    profiles = BouldererService(database_path, tmp_path / "uploads")

    public_profile = profiles.get_profile("owner", viewer)
    assert public_profile["stats"]["total_ascents"] == 1
    assert public_profile["stats"]["highest_grades"]["own_grade"] == "7a"
    assert [item["name"] for item in public_profile["recent_ascents"]] == ["Public Send"]
    assert [item["boulder_name"] for item in public_profile["media"]] == ["Public Send"]
    assert public_profile["is_owner"] is False

    owner_profile = profiles.get_profile("owner", owner)
    assert owner_profile["stats"]["total_ascents"] == 2
    assert owner_profile["stats"]["favourite_area"] == "Rocklands"
    assert owner_profile["stats"]["highest_grades"]["own_grade"] == "7b"
    assert owner_profile["stats"]["average_rating"] == 4.5
    assert {item["boulder_name"] for item in owner_profile["media"]} == {
        "Public Send",
        "Private Send",
    }
    assert owner_profile["is_owner"] is True


def test_owner_can_update_profile_and_upload_picture(tmp_path: Path) -> None:
    database_path = tmp_path / "dashboard.db"
    auth = AuthService(database_path, "invite", 7)
    owner = auth.signup(SignupRequest("owner", "password123", "invite", "Old Name")).user
    other = auth.signup(SignupRequest("other", "password123", "invite")).user
    profiles = BouldererService(database_path, tmp_path / "uploads")

    updated = profiles.update_profile("owner", ProfileUpdateRequest("New Name"), owner)
    assert updated["user"]["display_name"] == "New Name"

    with pytest.raises(ProfileError) as ownership_error:
        profiles.update_profile("owner", ProfileUpdateRequest("Wrong"), other)
    assert ownership_error.value.status_code == 403

    pictured = profiles.save_profile_picture(
        "owner",
        BytesIO(b"\x89PNG\r\n\x1a\nsmall-image"),
        "portrait.png",
        "image/png",
        owner,
    )
    assert pictured["user"]["profile_picture_url"] == "/api/boulderers/owner/profile-picture"
    picture = profiles.get_profile_picture("owner")
    assert picture.path.read_bytes() == b"\x89PNG\r\n\x1a\nsmall-image"
    assert picture.mime_type == "image/png"


def _boulder(
    name: str,
    grade: str,
    area: str,
    visibility: str,
    rating: int,
) -> BoulderCreateRequest:
    return BoulderCreateRequest(
        name=name,
        grade_27crags=grade,
        guide_grade=grade,
        own_grade=grade,
        area=area,
        sector="",
        climber="ignored",
        rating=rating,
        visibility=visibility,
    )
