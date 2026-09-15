from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from ClimbingDashboard.Config.constants import GRADE_ORDER, GRADE_SOURCE_FIELDS
from ClimbingDashboard.Models.boulder_media import BoulderMedia
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Models.dashboard_stats import GradeCount
from ClimbingDashboard.Models.user_account import UserAccount


@dataclass(frozen=True)
class BouldererProfileStats:
    """Calculated climbing highlights for one profile."""

    total_ascents: int
    flash_count: int
    favourite_area: str | None
    rated_ascents: int
    average_rating: float | None
    highest_grades: dict[str, str | None]
    grade_counts: dict[str, list[GradeCount]]

    def to_payload(self) -> dict[str, object]:
        return {
            "total_ascents": self.total_ascents,
            "flash_count": self.flash_count,
            "favourite_area": self.favourite_area,
            "rated_ascents": self.rated_ascents,
            "average_rating": self.average_rating,
            "highest_grades": self.highest_grades,
            "grade_counts": {
                source: [count.to_payload() for count in counts]
                for source, counts in self.grade_counts.items()
            },
        }


@dataclass(frozen=True)
class BouldererProfile:
    """Public profile data plus activity visible to the requesting viewer."""

    user: UserAccount
    stats: BouldererProfileStats
    recent_ascents: list[BoulderRecord]
    ratings: list[BoulderRecord]
    media: list[BoulderMedia]
    is_owner: bool

    @classmethod
    def build(
        cls,
        user: UserAccount,
        records: list[BoulderRecord],
        media: list[BoulderMedia],
        is_owner: bool,
    ) -> BouldererProfile:
        ordered_records = sorted(records, key=cls._record_date, reverse=True)
        ratings = [record for record in ordered_records if record.rating is not None]
        area_counts = Counter(record.area for record in records if record.area)
        stats = BouldererProfileStats(
            total_ascents=len(records),
            flash_count=sum(record.flash for record in records),
            favourite_area=area_counts.most_common(1)[0][0] if area_counts else None,
            rated_ascents=len(ratings),
            average_rating=(
                round(sum(record.rating or 0 for record in ratings) / len(ratings), 1)
                if ratings
                else None
            ),
            highest_grades={
                source: cls._highest_grade(
                    [getattr(record, source) for record in records if getattr(record, source)]
                )
                for source in GRADE_SOURCE_FIELDS
            },
            grade_counts={
                source: cls._ordered_grade_counts(
                    Counter(
                        getattr(record, source)
                        for record in records
                        if getattr(record, source)
                    )
                )
                for source in GRADE_SOURCE_FIELDS
            },
        )
        return cls(
            user=user,
            stats=stats,
            recent_ascents=ordered_records[:8],
            ratings=ratings,
            media=media,
            is_owner=is_owner,
        )

    def to_payload(self) -> dict[str, object]:
        return {
            "user": {
                "username": self.user.username,
                "display_name": self.user.display_name,
                "profile_picture_url": (
                    f"/api/boulderers/{self.user.username}/profile-picture"
                    if self.user.profile_picture_path
                    else None
                ),
            },
            "stats": self.stats.to_payload(),
            "recent_ascents": [record.to_payload() for record in self.recent_ascents],
            "ratings": [record.to_payload() for record in self.ratings],
            "media": [item.to_payload() for item in self.media],
            "is_owner": self.is_owner,
            "grade_order": list(GRADE_ORDER),
        }

    @staticmethod
    def _record_date(record: BoulderRecord) -> tuple[str, str, int]:
        return (
            record.climbed_on.isoformat() if record.climbed_on else "",
            record.added_at or "",
            record.ascent_id or 0,
        )

    @staticmethod
    def _highest_grade(grades: list[str]) -> str | None:
        if not grades:
            return None
        positions = {grade: index for index, grade in enumerate(GRADE_ORDER)}
        known = [grade for grade in grades if grade in positions]
        return max(known, key=positions.__getitem__) if known else sorted(grades)[-1]

    @staticmethod
    def _ordered_grade_counts(counts: Counter[str]) -> list[GradeCount]:
        known = [
            GradeCount(grade=grade, count=counts.pop(grade))
            for grade in GRADE_ORDER
            if counts.get(grade, 0) > 0
        ]
        return known + [
            GradeCount(grade=grade, count=count)
            for grade, count in sorted(counts.items())
        ]
