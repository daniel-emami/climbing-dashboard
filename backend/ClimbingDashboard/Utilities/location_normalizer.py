from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, replace

from ClimbingDashboard.Config.location_aliases import (
    AREA_ALIASES,
    AREA_SECTOR_SPLIT_AREAS,
    SECTOR_AREA_ALIASES,
)
from ClimbingDashboard.Models.boulder_record import BoulderRecord


@dataclass(frozen=True)
class NormalizedLocation:
    """Canonical area and sector names for one boulder problem."""

    area: str
    sector: str


class LocationNormalizer:
    """Normalize human/source location names before they are persisted."""

    def __init__(self) -> None:
        """Create a normalizer from configured area and sector aliases."""

        self.area_aliases = {
            self._lookup_key(alias): canonical
            for alias, canonical in AREA_ALIASES.items()
        }
        self.sector_area_aliases = {
            self._lookup_key(alias): area_and_sector
            for alias, area_and_sector in SECTOR_AREA_ALIASES.items()
        }
        self.area_sector_split_areas = {
            self._lookup_key(area): area
            for area in AREA_SECTOR_SPLIT_AREAS
        }

    def normalize(self, area: str, sector: str = "") -> NormalizedLocation:
        """Return canonical area and sector names from raw location fields."""

        clean_area = self._clean_text(area)
        clean_sector = self._clean_text(sector)
        clean_area, clean_sector = self._split_area_sector(clean_area, clean_sector)

        if not clean_sector:
            sector_location = self._sector_location(clean_area)
            if sector_location is not None:
                return sector_location

        sector_location = self._sector_location(clean_sector)
        if sector_location is not None and self._area_allows_sector_parent(
            clean_area,
            sector_location.area,
        ):
            return sector_location

        return NormalizedLocation(
            area=self._canonical_area(clean_area),
            sector=sector_location.sector if sector_location is not None else clean_sector,
        )

    def normalize_record(self, record: BoulderRecord) -> BoulderRecord:
        """Return a copy of a boulder record with canonical location names."""

        location = self.normalize(record.area, record.sector)
        return replace(record, area=location.area, sector=location.sector)

    def _split_area_sector(self, area: str, sector: str) -> tuple[str, str]:
        if sector:
            return area, sector

        for pattern in (r"\s*[-–—/]\s*", r"\s*:\s*"):
            parts = re.split(pattern, area, maxsplit=1)
            if len(parts) != 2:
                continue
            left, right = [part.strip() for part in parts]
            if self._lookup_key(left) in self.area_sector_split_areas and right:
                return left, right
        return area, sector

    def _sector_location(self, value: str) -> NormalizedLocation | None:
        if not value:
            return None
        area_and_sector = self.sector_area_aliases.get(self._lookup_key(value))
        if area_and_sector is None:
            return None
        area, sector = area_and_sector
        return NormalizedLocation(area=area, sector=sector)

    def _area_allows_sector_parent(self, area: str, parent_area: str) -> bool:
        if not area:
            return True
        return self._canonical_area(area) == parent_area

    def _canonical_area(self, area: str) -> str:
        return self.area_aliases.get(self._lookup_key(area), area)

    def _clean_text(self, value: str) -> str:
        return " ".join(value.split()).strip()

    def _lookup_key(self, value: str) -> str:
        text = self._clean_text(value).casefold()
        text = text.translate(str.maketrans({"ø": "o", "Ø": "o"}))
        text = unicodedata.normalize("NFKD", text)
        text = "".join(character for character in text if not unicodedata.combining(character))
        return re.sub(r"[^a-z0-9]+", " ", text).strip()
