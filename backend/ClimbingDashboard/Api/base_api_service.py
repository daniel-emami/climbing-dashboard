from __future__ import annotations

from abc import ABC, abstractmethod

from ClimbingDashboard.Api.api_models import BoulderCreateRequest, BouldersPayload
from ClimbingDashboard.Models.user_account import UserAccount


class BaseApiService(ABC):
    """Interface for dashboard API services."""

    @abstractmethod
    def get_boulders(self, current_user: UserAccount | None = None) -> BouldersPayload:
        """Return climbed boulders and calculated dashboard statistics."""

    @abstractmethod
    def save_boulder(
        self,
        request: BoulderCreateRequest,
        current_user: UserAccount,
    ) -> BouldersPayload:
        """Persist a climbed boulder and return the refreshed dashboard payload."""

    @abstractmethod
    def update_boulder(
        self,
        original_name: str,
        original_area: str,
        original_climber: str,
        request: BoulderCreateRequest,
        current_user: UserAccount,
    ) -> BouldersPayload:
        """Update a climbed boulder and return the refreshed dashboard payload."""

    @abstractmethod
    def delete_boulder(
        self,
        name: str,
        area: str,
        climber: str,
        current_user: UserAccount,
    ) -> BouldersPayload:
        """Delete a climbed boulder and return the refreshed dashboard payload."""
