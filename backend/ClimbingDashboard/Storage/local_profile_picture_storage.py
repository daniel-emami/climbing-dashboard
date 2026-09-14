from __future__ import annotations

from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.stored_media_file import StoredMediaFile


class LocalProfilePictureStorage:
    """Persist validated profile pictures beneath the uploads directory."""

    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }
    chunk_size = 1024 * 1024

    def __init__(self, uploads_root: str | Path, max_file_bytes: int) -> None:
        self.uploads_root = Path(uploads_root)
        self.picture_root = self.uploads_root / "profile-pictures"
        self.picture_root.mkdir(parents=True, exist_ok=True)
        self.max_file_bytes = max_file_bytes

    def save(
        self,
        source: BinaryIO,
        original_filename: str,
        mime_type: str | None,
    ) -> StoredMediaFile:
        clean_mime_type = (mime_type or "").strip().lower()
        suffix = self.allowed_types.get(clean_mime_type)
        if suffix is None:
            raise StorageError("Profile picture must be a JPEG, PNG, or WebP image")
        clean_filename = Path(original_filename or f"profile{suffix}").name
        relative_path = Path("profile-pictures") / f"{uuid4().hex}{suffix}"
        target_path = self.uploads_root / relative_path
        file_size = 0
        signature = b""
        try:
            with target_path.open("wb") as target:
                while chunk := source.read(self.chunk_size):
                    if len(signature) < 12:
                        signature = (signature + chunk)[:12]
                    file_size += len(chunk)
                    if file_size > self.max_file_bytes:
                        limit_mb = self.max_file_bytes // 1024 // 1024
                        raise StorageError(
                            f"Profile picture is too large. Limit is {limit_mb} MB"
                        )
                    target.write(chunk)
        except Exception:
            target_path.unlink(missing_ok=True)
            raise
        if file_size == 0:
            target_path.unlink(missing_ok=True)
            raise StorageError("Profile picture is empty")
        if not self._has_valid_signature(clean_mime_type, signature):
            target_path.unlink(missing_ok=True)
            raise StorageError("Uploaded file content does not match its image type")
        return StoredMediaFile(
            relative_path=relative_path.as_posix(),
            original_filename=clean_filename,
            mime_type=clean_mime_type,
            file_size=file_size,
        )

    def delete(self, relative_path: str | None) -> None:
        if relative_path:
            self._safe_path(relative_path).unlink(missing_ok=True)

    def readable_path(self, relative_path: str) -> Path:
        path = self._safe_path(relative_path)
        if not path.is_file():
            raise StorageError("Stored profile picture does not exist")
        return path

    def _safe_path(self, relative_path: str) -> Path:
        path = (self.uploads_root / relative_path).resolve()
        try:
            path.relative_to(self.uploads_root.resolve())
        except ValueError as exc:
            raise StorageError("Stored profile picture path is outside uploads") from exc
        return path

    def _has_valid_signature(self, mime_type: str, signature: bytes) -> bool:
        if mime_type == "image/jpeg":
            return signature.startswith(b"\xff\xd8\xff")
        if mime_type == "image/png":
            return signature.startswith(b"\x89PNG\r\n\x1a\n")
        if mime_type == "image/webp":
            return signature.startswith(b"RIFF") and signature[8:12] == b"WEBP"
        return False
