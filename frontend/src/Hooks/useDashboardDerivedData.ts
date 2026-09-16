import { useMemo } from "react";

import {
  GRADE_SOURCE_COLORS,
  GRADE_SOURCE_FIELDS,
  GRADE_SOURCE_LABELS
} from "../Config/gradeSources";
import type { DashboardPage } from "../Routing/hashRoutes";
import type { GradeChartSeries } from "../Components/GradeChart";
import type {
  BoulderPageIdentity,
  BouldersResponse,
  GradeField
} from "../Types/boulderTypes";
import { buildStats, isSameBoulder, recordMatchesSearch } from "../Utilities/dashboardStats";

type UseDashboardDerivedDataOptions = {
  activeAreaMapGradeField: GradeField;
  activePage: DashboardPage;
  data: BouldersResponse | null;
  searchQuery: string;
  selectedBoulder: BoulderPageIdentity | null;
  selectedClimber: string;
};

export function useDashboardDerivedData({
  activeAreaMapGradeField,
  activePage,
  data,
  searchQuery,
  selectedBoulder,
  selectedClimber
}: UseDashboardDerivedDataOptions) {
  const knownAreas = useMemo(
    () => data?.stats.areas.map((area) => area.area).sort((a, b) => a.localeCompare(b)) ?? [],
    [data]
  );

  const knownClimbers = useMemo(
    () =>
      Array.from(new Set(data?.records.map((record) => record.climber).filter(Boolean) ?? []))
        .sort((left, right) => left.localeCompare(right)),
    [data]
  );

  const climberDisplayNames = useMemo(
    () =>
      new Map(
        data?.records.map((record) => [record.climber, record.climber_display_name] as const) ?? []
      ),
    [data]
  );

  const knownSectors = useMemo(
    () =>
      Array.from(new Set(data?.records.map((record) => record.sector).filter(Boolean) ?? []))
        .sort((left, right) => left.localeCompare(right)),
    [data]
  );

  const knownGrades = useMemo(
    () =>
      data?.grade_order.filter((grade) =>
        data.stats.grade_counts.own_grade.some((entry) => entry.grade === grade)
      ) ?? [],
    [data]
  );

  const visibleData = useMemo<BouldersResponse | null>(() => {
    if (!data) {
      return null;
    }
    const records =
      activePage === "feed"
        ? data.records
        : data.records.filter(
            (record) =>
              (!selectedClimber || record.climber === selectedClimber) &&
              recordMatchesSearch(record, searchQuery)
          );
    return {
      ...data,
      records,
      stats: buildStats(records, data.grade_order)
    };
  }, [activePage, data, searchQuery, selectedClimber]);

  const selectedBoulderRecords = useMemo(() => {
    if (!data || !selectedBoulder) {
      return [];
    }
    return data.records.filter((record) => isSameBoulder(record, selectedBoulder));
  }, [data, selectedBoulder]);

  const gradeChartSeries = useMemo<GradeChartSeries[]>(() => {
    if (!visibleData) {
      return [];
    }
    return GRADE_SOURCE_FIELDS.map((field) => ({
      key: field,
      label: GRADE_SOURCE_LABELS[field],
      color: GRADE_SOURCE_COLORS[field],
      data: visibleData.stats.grade_counts[field]
    }));
  }, [visibleData]);

  return {
    activeAreaMapGradeLabel: GRADE_SOURCE_LABELS[activeAreaMapGradeField],
    climberDisplayNames,
    gradeChartSeries,
    gradeChartTitle: "Boulders by all grade sources",
    knownAreas,
    knownClimbers,
    knownGrades,
    knownSectors,
    selectedBoulderRecords,
    visibleData
  };
}
