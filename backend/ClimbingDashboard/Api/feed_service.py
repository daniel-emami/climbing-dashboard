from __future__ import annotations

from datetime import datetime

from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.user_account import UserAccount
from ClimbingDashboard.Storage.base_storage import BaseStorage


def _timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.min
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return datetime.min


class FeedService:
    """Read one viewer's ordered feed, including comments on selected ascents."""

    def __init__(self, storage: BaseStorage) -> None:
        self.storage = storage

    def get_feed(self, current_user: UserAccount | None) -> dict[str, object]:
        private_user_id = current_user.id if current_user else None
        try:
            records = self.storage.read_boulders(private_user_id, feed_limit=30)
            # A feed of 30 items can include at most 30 videos. The storage query
            # applies viewer visibility before this limit.
            media = self.storage.read_recent_boulder_media(30, private_user_id, feed_order=True)
            items: list[dict[str, object]] = []
            for record in records:
                items.append(
                    {
                        "kind": "ascent",
                        "key": f"ascent-{record.ascent_id}",
                        "timestamp": _timestamp(
                            record.climbed_on.isoformat() if record.climbed_on else record.added_at
                        ),
                        "record": record.to_payload(),
                    }
                )
            for video in media:
                items.append(
                    {
                        "kind": "video",
                        "key": f"video-{video.id}",
                        "timestamp": _timestamp(video.created_at),
                        "media": video.to_payload(),
                    }
                )
            items.sort(key=lambda item: (item["timestamp"], item["key"]), reverse=True)
            selected = items[:30]
            ascent_ids = [
                int(item["record"]["ascent_id"])
                for item in selected
                if item["kind"] == "ascent" and item["record"]["ascent_id"] is not None
            ]
            comments = self.storage.read_ascent_comments_for_ascent_ids(ascent_ids)
        except StorageError as exc:
            raise ApiDataError(f"Could not read feed: {exc}") from exc
        for item in selected:
            item.pop("timestamp")
            item.pop("key")
            if item["kind"] == "ascent":
                ascent_id = item["record"]["ascent_id"]
                item["comments"] = [comment.to_payload() for comment in comments.get(ascent_id, [])]
        return {"items": selected}
