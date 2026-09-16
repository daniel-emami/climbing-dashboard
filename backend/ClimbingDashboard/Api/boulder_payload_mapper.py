from __future__ import annotations

from typing import Any

from ClimbingDashboard.Api.api_models import BoulderCreateRequest
from ClimbingDashboard.Models.boulder_record import BoulderRecord


class BoulderPayloadMapper:
    """Convert JSON-like boulder payloads into domain records."""

    def boulder_from_payload(self, payload: dict[str, Any]) -> BoulderRecord:
        """Return one boulder record from a frontend payload."""

        return BoulderCreateRequest.from_payload(payload).to_record()

    def boulders_from_payloads(self, payloads: list[object]) -> list[BoulderRecord]:
        """Return boulder records from a list of frontend payloads."""

        return [
            self.boulder_from_payload(payload)
            for payload in payloads
            if isinstance(payload, dict)
        ]
