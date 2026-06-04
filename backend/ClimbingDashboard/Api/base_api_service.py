from __future__ import annotations

from abc import ABC, abstractmethod

from ClimbingDashboard.Api.api_models import BoulderCreateRequest, BouldersPayload


class BaseApiService(ABC):
    """Interface for dashboard API services."""

    @abstractmethod
    def get_boulders(self) -> BouldersPayload:
        """Return climbed boulders and calculated dashboard statistics."""

    @abstractmethod
    def save_boulder(self, request: BoulderCreateRequest) -> BouldersPayload:
        """Persist a climbed boulder and return the refreshed dashboard payload."""
