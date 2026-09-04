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
            own_grade=str(payload.get("own_grade", "")).strip(),
            area=str(payload.get("area", "")).strip(),
            climber=str(payload.get("climber", "")).strip(),
            flash=bool(payload.get("flash", False)),
            climbed_on=parse_climbed_date(payload.get("climbed_on")),
            rating=self._rating(payload.get("rating")),
        )

    def boulders_from_payloads(self, payloads: list[object]) -> list[BoulderRecord]:
        """Return boulder records from a list of frontend payloads."""

        return [
            self.boulder_from_payload(payload)
            for payload in payloads
            if isinstance(payload, dict)
        ]

    def _rating(self, value: object) -> int | None:
        if value is None:
            return None
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return None
            try:
                return self._rating_in_range(int(text))
            except ValueError as exc:
                raise ValueError("rating must be empty or a number from 1 to 5") from exc
        if isinstance(value, bool):
            raise ValueError("rating must be empty or a number from 1 to 5")
        if isinstance(value, int):
            return self._rating_in_range(value)
        if isinstance(value, float) and value.is_integer():
            return self._rating_in_range(int(value))
        raise ValueError("rating must be empty or a number from 1 to 5")

    def _rating_in_range(self, rating: int) -> int:
        if rating < 1 or rating > 5:
            raise ValueError("rating must be empty or a number from 1 to 5")
        return rating
