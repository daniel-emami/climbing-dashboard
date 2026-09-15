from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class StoredMediaFile:
    """A file saved in the local uploads directory."""

    relative_path: str
    original_filename: str
    mime_type: str
    file_size: int
