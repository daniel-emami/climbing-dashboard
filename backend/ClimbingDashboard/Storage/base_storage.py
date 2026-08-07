from __future__ import annotations

from abc import ABC, abstractmethod

from ClimbingDashboard.Models.ascent_comment import AscentComment
from ClimbingDashboard.Models.boulder_comment import BoulderComment
from ClimbingDashboard.Models.boulder_media import BoulderMedia
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Models.stored_media_file import StoredMediaFile


class BaseStorage(ABC):
    """Interface for boulder persistence implementations."""

    @abstractmethod
    def read_boulders(self) -> list[BoulderRecord]:
        """Read all stored boulder records."""

    @abstractmethod
    def append_boulder(self, record: BoulderRecord) -> BoulderRecord:
        """Append and persist one boulder record."""

    @abstractmethod
    def append_boulders(self, records: list[BoulderRecord]) -> list[BoulderRecord]:
        """Append and persist multiple boulder records."""

    @abstractmethod
    def update_boulder(
        self,
        original_name: str,
        original_area: str,
        original_sector: str,
        original_climber: str,
        record: BoulderRecord,
    ) -> BoulderRecord:
        """Update one persisted boulder record."""

    @abstractmethod
    def delete_boulder(self, name: str, area: str, sector: str, climber: str) -> None:
        """Delete one persisted boulder record."""

    @abstractmethod
    def read_boulder_comments(self, name: str, area: str, sector: str) -> list[BoulderComment]:
        """Read all public comments for one boulder problem."""

    @abstractmethod
    def append_boulder_comment(
        self,
        name: str,
        area: str,
        sector: str,
        climber: str,
        body: str,
    ) -> BoulderComment:
        """Append and persist one boulder comment."""

    @abstractmethod
    def update_boulder_comment(
        self,
        comment_id: int,
        climber: str,
        body: str,
    ) -> BoulderComment:
        """Update one persisted boulder comment."""

    @abstractmethod
    def delete_boulder_comment(self, comment_id: int) -> BoulderComment:
        """Soft-delete one persisted boulder comment."""

    @abstractmethod
    def read_ascent_comments(self, ascent_id: int) -> list[AscentComment]:
        """Read all public comments for one ascent."""

    @abstractmethod
    def read_ascent_comments_for_ascent_ids(
        self,
        ascent_ids: list[int],
    ) -> dict[int, list[AscentComment]]:
        """Read public comments grouped by ascent id."""

    @abstractmethod
    def append_ascent_comment(
        self,
        ascent_id: int,
        climber: str,
        body: str,
    ) -> AscentComment:
        """Append and persist one ascent comment."""

    @abstractmethod
    def update_ascent_comment(
        self,
        comment_id: int,
        climber: str,
        body: str,
    ) -> AscentComment:
        """Update one persisted ascent comment."""

    @abstractmethod
    def delete_ascent_comment(self, comment_id: int) -> AscentComment:
        """Soft-delete one persisted ascent comment."""

    @abstractmethod
    def read_boulder_media(self, name: str, area: str, sector: str) -> list[BoulderMedia]:
        """Read all public media for one boulder problem."""

    @abstractmethod
    def read_media_for_ascent_ids(
        self,
        ascent_ids: list[int],
    ) -> dict[int, list[BoulderMedia]]:
        """Read public media grouped by ascent id."""

    @abstractmethod
    def append_boulder_media(
        self,
        name: str,
        area: str,
        sector: str,
        ascent_id: int | None,
        climber: str,
        caption: str,
        stored_file: StoredMediaFile,
    ) -> BoulderMedia:
        """Append and persist one uploaded boulder media record."""

    @abstractmethod
    def delete_boulder_media(self, media_id: int) -> BoulderMedia:
        """Soft-delete one persisted media record."""
