from __future__ import annotations

import subprocess
from pathlib import Path

from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Storage.base_video_transcoder import BaseVideoTranscoder


class FfmpegVideoTranscoder(BaseVideoTranscoder):
    """Use FFmpeg to store uploads as compact, browser-friendly MP4 files."""

    max_width = 1920
    max_height = 1080
    constant_rate_factor = 22
    audio_bitrate = "128k"

    def __init__(self, executable: str = "ffmpeg") -> None:
        self.executable = executable

    def transcode_to_mp4(self, source_path: Path, target_path: Path) -> None:
        """Write an optimized H.264 MP4 file to the target path."""

        target_path.parent.mkdir(parents=True, exist_ok=True)
        command = [
            self.executable,
            "-y",
            "-i",
            str(source_path),
            "-map",
            "0:v:0",
            "-map",
            "0:a?",
            "-vf",
            (
                f"scale=w=min({self.max_width}\\,iw):"
                f"h=min({self.max_height}\\,ih):force_original_aspect_ratio=decrease"
            ),
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            str(self.constant_rate_factor),
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            self.audio_bitrate,
            "-movflags",
            "+faststart",
            str(target_path),
        ]
        try:
            completed_process = subprocess.run(
                command,
                capture_output=True,
                check=False,
                text=True,
            )
        except FileNotFoundError as exc:
            raise StorageError(
                "FFmpeg is required to process video uploads. "
                "Install ffmpeg and restart the backend."
            ) from exc

        if completed_process.returncode != 0:
            target_path.unlink(missing_ok=True)
            error_output = completed_process.stderr.strip()
            raise StorageError(
                "FFmpeg could not process the uploaded video"
                + (f": {error_output}" if error_output else "")
            )

        if not target_path.is_file() or target_path.stat().st_size == 0:
            target_path.unlink(missing_ok=True)
            raise StorageError("FFmpeg did not produce a valid video file")
