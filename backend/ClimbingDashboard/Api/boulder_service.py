from __future__ import annotations

from ClimbingDashboard.Api.api_models import BoulderCreateRequest, BouldersPayload
from ClimbingDashboard.Api.dashboard_stats_service import DashboardStatsService
from ClimbingDashboard.Config.constants import GRADE_ORDER
from ClimbingDashboard.Exceptions.api_data_error import ApiDataError
from ClimbingDashboard.Exceptions.storage_error import StorageError
from ClimbingDashboard.Models.boulder_record import BoulderRecord
from ClimbingDashboard.Models.user_account import UserAccount
from ClimbingDashboard.Storage.base_storage import BaseStorage
from ClimbingDashboard.Utilities.location_normalizer import LocationNormalizer


class BoulderService:
    def __init__(
        self,
        storage: BaseStorage,
        location_normalizer: LocationNormalizer,
        dashboard_stats_service: DashboardStatsService,
    ) -> None:
        self.storage = storage
        self.location_normalizer = location_normalizer
        self.dashboard_stats_service = dashboard_stats_service

    def get_boulders(self, current_user: UserAccount | None = None) -> BouldersPayload:
        records = self._read_records(current_user)
        return {
            "records": [record.to_payload() for record in records],
            "stats": self.dashboard_stats_service.build_stats(records).to_payload(),
            "grade_order": list(GRADE_ORDER),
        }

    def save_boulder(
        self,
        request: BoulderCreateRequest,
        current_user: UserAccount,
    ) -> BouldersPayload:
        record = self._record_from_request(request, current_user)
        try:
            self.storage.append_boulder(record, current_user.id)
        except StorageError as exc:
            raise ApiDataError(f"Could not save boulder: {exc}") from exc
        return self.get_boulders(current_user)

    def update_boulder(
        self,
        original_name: str,
        original_area: str,
        original_sector: str,
        original_climber: str,
        request: BoulderCreateRequest,
        current_user: UserAccount,
    ) -> BouldersPayload:
        self._ensure_can_change_ascent(original_climber, current_user)
        record = self._record_from_request(request, current_user)
        try:
            self.storage.update_boulder(
                original_name,
                original_area,
                original_sector,
                original_climber,
                record,
                current_user.id,
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not update boulder: {exc}") from exc
        return self.get_boulders(current_user)

    def delete_boulder(
        self,
        name: str,
        area: str,
        sector: str,
        climber: str,
        current_user: UserAccount,
    ) -> BouldersPayload:
        self._ensure_can_change_ascent(climber, current_user)
        try:
            self.storage.delete_boulder(name, area, sector, climber)
        except StorageError as exc:
            raise ApiDataError(f"Could not delete boulder: {exc}") from exc
        return self.get_boulders(current_user)

    def _read_records(self, current_user: UserAccount | None = None) -> list[BoulderRecord]:
        try:
            return self.storage.read_boulders(
                private_user_id=current_user.id if current_user is not None else None
            )
        except StorageError as exc:
            raise ApiDataError(f"Could not read boulders: {exc}") from exc

    def _record_from_request(
        self,
        request: BoulderCreateRequest,
        current_user: UserAccount,
    ) -> BoulderRecord:
        record = request.to_record(current_user.username)
        return self.location_normalizer.normalize_record(record)

    def _ensure_can_change_ascent(self, climber: str, current_user: UserAccount) -> None:
        if climber.lower() != current_user.username.lower():
            raise PermissionError("You can only change your own ascents")
