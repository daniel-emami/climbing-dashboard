import sqlite3
from datetime import date, timedelta
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient

from ClimbingDashboard.Api.api_app import create_app
from ClimbingDashboard.Api.api_models import BoulderCreateRequest, BoulderMediaUploadRequest
from ClimbingDashboard.Api.auth_models import SignupRequest
from ClimbingDashboard.Storage.base_video_transcoder import BaseVideoTranscoder


class CopyVideoTranscoder(BaseVideoTranscoder):
    def transcode_to_mp4(self, source_path: Path, target_path: Path) -> None:
        target_path.write_bytes(source_path.read_bytes())


def test_feed_returns_visible_ascents_and_their_comments_in_one_response(tmp_path: Path) -> None:
    app = create_app(tmp_path / "feed.db")
    auth = app.state.auth_service
    auth.invite_code = "invite"
    owner = auth.signup(SignupRequest("owner", "password123", "invite"))
    other = auth.signup(SignupRequest("other", "password123", "invite"))
    service = app.state.api_service
    for user, visibility in ((owner.user, "private"), (other.user, "public")):
        service.save_boulder(
            BoulderCreateRequest(
                "Problem", "6a", "6a", "6a", "Area", "", "", visibility=visibility
            ),
            user,
        )
    public_ascent = next(
        record for record in service.get_boulders()["records"] if record["climber"] == "other"
    )
    service.storage.append_ascent_comment(
        int(public_ascent["ascent_id"]), "other", "Nice", other.user.id
    )
    service.media_file_storage.video_transcoder = CopyVideoTranscoder()
    service.save_boulder_video(
        BoulderMediaUploadRequest("Problem", "Area", "", "Private video"),
        BytesIO(b"video"),
        "video.mp4",
        "video/mp4",
        owner.user,
    )

    with TestClient(app) as client:
        anonymous = client.get("/api/feed")
        assert anonymous.status_code == 200
        assert [item["record"]["climber"] for item in anonymous.json()["items"]] == ["other"]
        assert anonymous.json()["items"][0]["comments"][0]["body"] == "Nice"
        assert all(item["kind"] == "ascent" for item in anonymous.json()["items"])

        client.cookies.set(app.state.settings.session_cookie_name, owner.token)
        owner_feed = client.get("/api/feed")
        assert owner_feed.status_code == 200
        assert {
            item["record"]["climber"]
            for item in owner_feed.json()["items"]
            if item["kind"] == "ascent"
        } == {"owner", "other"}
        assert any(item["kind"] == "video" for item in owner_feed.json()["items"])
        detail_params = {"name": "problem", "area": "area", "sector": ""}
        owner_detail = client.get("/api/boulders/detail", params=detail_params)
        assert owner_detail.status_code == 200
        assert {record["climber"] for record in owner_detail.json()["records"]} == {
            "owner",
            "other",
        }
        client.cookies.clear()
        anonymous_detail = client.get("/api/boulders/detail", params=detail_params)
        assert [record["climber"] for record in anonymous_detail.json()["records"]] == ["other"]


def test_feed_returns_only_the_latest_thirty_items(tmp_path: Path) -> None:
    app = create_app(tmp_path / "feed.db")
    auth = app.state.auth_service
    auth.invite_code = "invite"
    user = auth.signup(SignupRequest("climber", "password123", "invite")).user
    service = app.state.api_service
    for index in range(31):
        service.save_boulder(
            BoulderCreateRequest(
                f"Problem {index}",
                "6a",
                "6a",
                "6a",
                "Area",
                "",
                "",
                climbed_on=date(2026, 1, 1) + timedelta(days=index),
            ),
            user,
        )
    with TestClient(app) as client:
        response = client.get("/api/feed")
    assert response.status_code == 200
    names = [item["record"]["name"] for item in response.json()["items"]]
    assert len(names) == 30
    assert names[0] == "Problem 30"
    assert "Problem 0" not in names


def test_feed_video_ties_use_the_same_order_before_and_after_limit(tmp_path: Path) -> None:
    database_path = tmp_path / "feed.db"
    app = create_app(database_path)
    auth = app.state.auth_service
    auth.invite_code = "invite"
    user = auth.signup(SignupRequest("climber", "password123", "invite")).user
    service = app.state.api_service
    service.save_boulder(BoulderCreateRequest("Problem", "6a", "6a", "6a", "Area", "", ""), user)
    service.media_file_storage.video_transcoder = CopyVideoTranscoder()
    service.save_boulder_video(
        BoulderMediaUploadRequest("Problem", "Area", "", "Video"),
        BytesIO(b"video"),
        "video.mp4",
        "video/mp4",
        user,
    )
    with sqlite3.connect(database_path) as connection:
        for _ in range(99):
            connection.execute(
                """INSERT INTO boulder_media (
                    boulder_id, ascent_id, user_id, climber, media_type, file_path,
                    original_filename, mime_type, file_size, caption, created_at, updated_at
                ) SELECT boulder_id, ascent_id, user_id, climber, media_type, file_path,
                    original_filename, mime_type, file_size, caption,
                    '2026-01-01 00:00:00', '2026-01-01 00:00:00'
                FROM boulder_media WHERE id = 1"""
            )
        connection.execute("UPDATE boulder_media SET created_at = '2026-01-01 00:00:00'")
    with TestClient(app) as client:
        response = client.get("/api/feed")
    video_ids = [
        item["media"]["id"] for item in response.json()["items"] if item["kind"] == "video"
    ]
    assert 9 in video_ids
    assert len(response.json()["items"]) == 30


def test_feed_form_save_can_skip_the_dashboard_payload(tmp_path: Path) -> None:
    app = create_app(tmp_path / "feed.db")
    auth = app.state.auth_service
    auth.invite_code = "invite"
    session = auth.signup(SignupRequest("climber", "password123", "invite"))
    with TestClient(app) as client:
        client.cookies.set(app.state.settings.session_cookie_name, session.token)
        response = client.post(
            "/api/boulders?dashboard=false", json={"name": "New Problem", "area": "Area"}
        )
        assert response.status_code == 200
        assert response.json() == {"ok": True}
        assert any(
            item["kind"] == "ascent" and item["record"]["name"] == "New Problem"
            for item in client.get("/api/feed").json()["items"]
        )
