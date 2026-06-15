from __future__ import annotations

from typing import Any

from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Utilities.date_utils import parse_climbed_date


class BoulderPayloadMapper:
    """Convert JSON-like boulder payloads into domain records."""

    def boulder_from_payload(self, payload: dict[str, Any]) -> BoulderRecord:
        """Return one boulder record from a frontend payload."""

        return BoulderRecord(
            name=str(payload.get("name", "")).strip(),
            grade_27crags=str(payload.get("grade_27crags", "")).strip(),
            guide_grade=str(payload.get("guide_grade", "")).strip(),
            my_grade=str(payload.get("my_grade", "")).strip(),
            area=str(payload.get("area", "")).strip(),
            climber=str(payload.get("climber", "")).strip(),
            flash=bool(payload.get("flash", False)),
            climbed_on=parse_climbed_date(payload.get("climbed_on")),
        )

    def boulders_from_payloads(self, payloads: list[object]) -> list[BoulderRecord]:
        """Return boulder records from a list of frontend payloads."""

        return [
            self.boulder_from_payload(payload)
            for payload in payloads
            if isinstance(payload, dict)
        ]
