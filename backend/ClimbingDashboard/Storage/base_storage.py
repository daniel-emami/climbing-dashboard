from __future__ import annotations

from abc import ABC, abstractmethod

from ClimbingDashboard.Models.boulder_comment import BoulderComment
from ClimbingDashboard.Models.boulder_record import BoulderRecord


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
