from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ReadableMediaFile:
    """One authorized media file ready to be served to the browser."""

    path: Path
    mime_type: str

