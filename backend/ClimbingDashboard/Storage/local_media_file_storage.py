from __future__ import annotations

from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.stored_media_file import StoredMediaFile


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

    def __init__(self, uploads_root: str | Path, max_video_bytes: int) -> None:
        """Create a file store rooted at the supplied uploads directory."""

        self.uploads_root = Path(uploads_root)
        self.max_video_bytes = max_video_bytes
        self.video_root = self.uploads_root / "videos"
        self.video_root.mkdir(parents=True, exist_ok=True)

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

        relative_path = Path("videos") / f"{uuid4().hex}{suffix}"
        target_path = self.uploads_root / relative_path
        file_size = 0
        try:
            with target_path.open("wb") as target:
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
        except Exception:
            target_path.unlink(missing_ok=True)
            raise

        if file_size == 0:
            target_path.unlink(missing_ok=True)
            raise StorageError("Video file is empty")

        return StoredMediaFile(
            relative_path=relative_path.as_posix(),
            original_filename=clean_filename,
            mime_type=clean_mime_type,
            file_size=file_size,
        )

    def delete(self, relative_path: str) -> None:
        """Remove one saved upload if it still exists."""

        target_path = (self.uploads_root / relative_path).resolve()
        try:
            target_path.relative_to(self.uploads_root.resolve())
        except ValueError as exc:
            raise StorageError("Stored media path is outside the uploads directory") from exc
        target_path.unlink(missing_ok=True)
