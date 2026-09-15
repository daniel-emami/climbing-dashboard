from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path


class BaseVideoTranscoder(ABC):
    """Interface for turning uploaded videos into browser-friendly files."""

    @abstractmethod
    def transcode_to_mp4(self, source_path: Path, target_path: Path) -> None:
        """Write an optimized MP4 file to the target path."""
