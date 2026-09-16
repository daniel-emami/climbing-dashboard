from __future__ import annotations

from ClimbingDashboard.Utilities.location_normalizer import (
    LocationNormalizer,
    NormalizedLocation,
)


def location_candidates(
    location_normalizer: LocationNormalizer,
    area: str,
    sector: str,
) -> list[NormalizedLocation]:
    exact_location = NormalizedLocation(area=area, sector=sector)
    normalized_location = location_normalizer.normalize(area, sector)
    if normalized_location == exact_location:
        return [exact_location]
    return [exact_location, normalized_location]
