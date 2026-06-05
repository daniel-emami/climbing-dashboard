import { useCallback, useEffect, useMemo, useState } from "react";
import { addBoulder, deleteBoulder, fetchBoulders, updateBoulder } from "./Api/boulderApi";
import AreaChart from "./Components/AreaChart";
import AreaGradeMatrix from "./Components/AreaGradeMatrix";
import BoulderForm from "./Components/BoulderForm";
import BoulderTable from "./Components/BoulderTable";
import ErrorState from "./Components/ErrorState";
import GradeChart, { type GradeChartSeries } from "./Components/GradeChart";
import LoadingState from "./Components/LoadingState";
import SummaryStrip from "./Components/SummaryStrip";
import TheTopoImportPanel from "./Components/TheTopoImportPanel";
import {
  GRADE_SOURCE_COLORS,
  GRADE_SOURCE_FIELDS,
  GRADE_SOURCE_LABELS,
  type GradeChartMode
} from "./Config/gradeSources";
import type {
  BoulderCreateRequest,
  BoulderIdentity,
  BouldersResponse,
  GradeField
} from "./Types/boulderTypes";

function formatRefreshTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [data, setData] = useState<BouldersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeAreaMapGradeField, setActiveAreaMapGradeField] = useState<GradeField>("my_grade");
  const [gradeChartMode, setGradeChartMode] = useState<GradeChartMode>("my_grade");

  const loadStoredData = useCallback(async () => {
    try {
      const payload = await fetchBoulders();
      setData(payload);
      setError(null);
      setLastUpdated(formatRefreshTime());
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown error");
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStoredData();
  }, [loadStoredData]);

  const knownAreas = useMemo(
    () => data?.stats.areas.map((area) => area.area).sort((a, b) => a.localeCompare(b)) ?? [],
    [data]
  );

  const knownGrades = useMemo(
    () =>
      data?.grade_order.filter((grade) =>
        data.stats.grade_counts.my_grade.some((entry) => entry.grade === grade)
      ) ?? [],
    [data]
  );

  const activeAreaMapGradeLabel = GRADE_SOURCE_LABELS[activeAreaMapGradeField];
  const gradeChartSeries = useMemo<GradeChartSeries[]>(() => {
    if (!data) {
      return [];
    }
    const fields = gradeChartMode === "all" ? GRADE_SOURCE_FIELDS : [gradeChartMode];
    return fields.map((field) => ({
      key: field,
      label: GRADE_SOURCE_LABELS[field],
      color: GRADE_SOURCE_COLORS[field],
      data: data.stats.grade_counts[field]
    }));
  }, [data, gradeChartMode]);
  const gradeChartTitle =
    gradeChartMode === "all"
      ? "Boulders by all grade sources"
      : `Boulders by ${GRADE_SOURCE_LABELS[gradeChartMode].toLowerCase()}`;

  const handleAddBoulder = async (request: BoulderCreateRequest) => {
    setIsSaving(true);
    try {
      const payload = await addBoulder(request);
      setData(payload);
      setError(null);
      setLastUpdated(formatRefreshTime());
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown error");
      throw unknownError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBoulder = async (
    original: BoulderIdentity,
    boulder: BoulderCreateRequest
  ) => {
    setIsSaving(true);
    try {
      const payload = await updateBoulder({ original, boulder });
      setData(payload);
      setError(null);
      setLastUpdated(formatRefreshTime());
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown error");
      throw unknownError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBoulder = async (request: BoulderIdentity) => {
    setIsSaving(true);
    try {
      const payload = await deleteBoulder(request);
      setData(payload);
      setError(null);
      setLastUpdated(formatRefreshTime());
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown error");
      throw unknownError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportedBoulders = (payload: BouldersResponse) => {
    setData(payload);
    setError(null);
    setLastUpdated(formatRefreshTime());
  };

  return (
    <main className="app-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Outdoor boulders</p>
          <h1>Climbing dashboard</h1>
        </div>
        <dl className="workspace-status" aria-label="Loaded data status">
          <div>
            <dt>Workbook</dt>
            <dd>Boulders_Ticklist.xlsx</dd>
          </div>
          <div>
            <dt>Rows</dt>
            <dd>{data?.records.length ?? 0}</dd>
          </div>
          <div>
            <dt>Loaded</dt>
            <dd>{lastUpdated ?? "-"}</dd>
          </div>
        </dl>
      </header>

      <div className="dashboard-layout">
        <aside className="control-rail">
          <BoulderForm
            isSaving={isSaving}
            knownAreas={knownAreas}
            knownGrades={knownGrades}
            onSubmit={handleAddBoulder}
          />
          <TheTopoImportPanel
            onImported={handleImportedBoulders}
            onError={setError}
          />
        </aside>

        <section className="dashboard-main" aria-label="Climbing dashboard">
          {isInitialLoading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {data && !isInitialLoading && (
            <>
              <SummaryStrip data={data} />

              <section className="panel grade-controls-panel">
                <div className="panel-heading">
                  <span className="section-kicker">Select Grade Source</span>
                </div>
                <div className="segmented-control" role="group" aria-label="Grade source">
                  {GRADE_SOURCE_FIELDS.map((field) => (
                    <button
                      className={field === gradeChartMode ? "active" : ""}
                      key={field}
                      type="button"
                      onClick={() => {
                        setActiveAreaMapGradeField(field);
                        setGradeChartMode(field);
                      }}
                    >
                      {GRADE_SOURCE_LABELS[field]}
                    </button>
                  ))}
                  <button
                    className={gradeChartMode === "all" ? "active" : ""}
                    type="button"
                    onClick={() => setGradeChartMode("all")}
                  >
                    All
                  </button>
                </div>
              </section>

              <div className="insight-grid">
                <GradeChart
                  title={gradeChartTitle}
                  gradeOrder={data.grade_order}
                  series={gradeChartSeries}
                />
                <AreaChart
                  data={data.stats.area_counts_by_grade_source[activeAreaMapGradeField]}
                  gradeSourceLabel={activeAreaMapGradeLabel}
                />
              </div>

              <AreaGradeMatrix
                rows={data.stats.area_grade_matrix_by_grade_source[activeAreaMapGradeField]}
                grades={data.grade_order}
                gradeSourceLabel={activeAreaMapGradeLabel}
              />
              <BoulderTable
                records={data.records}
                gradeOrder={data.grade_order}
                isSaving={isSaving}
                onDelete={handleDeleteBoulder}
                onUpdate={handleUpdateBoulder}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
