from __future__ import annotations

from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.stored_media_file import StoredMediaFile
from ClimbingDashboard.Storage.base_video_transcoder import BaseVideoTranscoder
from ClimbingDashboard.Storage.ffmpeg_video_transcoder import FfmpegVideoTranscoder


class LocalMediaFileStorage:
    """Save and remove uploaded media files from the local data directory."""

    allowed_video_extensions = {
        ".m4v",
        ".mov",
        ".mp4",
        ".webm",
    }
    default_mime_type = "application/octet-stream"
    chunk_size = 1024 * 1024

    optimized_video_mime_type = "video/mp4"

    def __init__(
        self,
        uploads_root: str | Path,
        max_video_bytes: int,
        video_transcoder: BaseVideoTranscoder | None = None,
    ) -> None:
        """Create a file store rooted at the supplied uploads directory."""

        self.uploads_root = Path(uploads_root)
        self.max_video_bytes = max_video_bytes
        self.video_transcoder = (
            video_transcoder if video_transcoder is not None else FfmpegVideoTranscoder()
        )
        self.video_root = self.uploads_root / "videos"
        self.temporary_video_root = self.uploads_root / "tmp" / "videos"
        self.video_root.mkdir(parents=True, exist_ok=True)
        self.temporary_video_root.mkdir(parents=True, exist_ok=True)

    def save_video(
        self,
        source: BinaryIO,
        original_filename: str,
        mime_type: str | None,
    ) -> StoredMediaFile:
        """Persist a video upload and return metadata for the saved file."""

        clean_filename = Path(original_filename or "upload.mp4").name
        suffix = Path(clean_filename).suffix.lower()
        clean_mime_type = (mime_type or self.default_mime_type).strip().lower()
        if suffix not in self.allowed_video_extensions or not clean_mime_type.startswith("video/"):
            raise StorageError("Only video files are supported")

        upload_id = uuid4().hex
        temporary_path = self.temporary_video_root / f"{upload_id}{suffix}"
        relative_path = Path("videos") / f"{upload_id}.mp4"
        target_path = self.uploads_root / relative_path
        file_size = 0
        try:
            with temporary_path.open("wb") as target:
                while True:
                    chunk = source.read(self.chunk_size)
                    if not chunk:
                        break
                    file_size += len(chunk)
                    if file_size > self.max_video_bytes:
                        limit_mb = self.max_video_bytes // 1024 // 1024
                        raise StorageError(
                            f"Video is too large. Limit is {limit_mb} MB"
                        )
                    target.write(chunk)

            if file_size == 0:
                raise StorageError("Video file is empty")

            self.video_transcoder.transcode_to_mp4(temporary_path, target_path)
        except Exception:
            temporary_path.unlink(missing_ok=True)
            target_path.unlink(missing_ok=True)
            raise
        finally:
            temporary_path.unlink(missing_ok=True)

        return StoredMediaFile(
            relative_path=relative_path.as_posix(),
            original_filename=clean_filename,
            mime_type=self.optimized_video_mime_type,
            file_size=target_path.stat().st_size,
        )

    def delete(self, relative_path: str) -> None:
        """Remove one saved upload if it still exists."""

        target_path = self._safe_path(relative_path)
        target_path.unlink(missing_ok=True)

    def readable_path(self, relative_path: str) -> Path:
        """Return a safe existing upload path."""

        target_path = self._safe_path(relative_path)
        if not target_path.is_file():
            raise StorageError("Stored media file does not exist")
        return target_path

    def _safe_path(self, relative_path: str) -> Path:
        target_path = (self.uploads_root / relative_path).resolve()
        try:
            target_path.relative_to(self.uploads_root.resolve())
        except ValueError as exc:
            raise StorageError("Stored media path is outside the uploads directory") from exc
        return target_path
