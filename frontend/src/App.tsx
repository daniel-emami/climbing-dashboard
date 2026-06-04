import { useCallback, useEffect, useMemo, useState } from "react";
import { addBoulder, fetchBoulders } from "./Api/boulderApi";
import AreaChart from "./Components/AreaChart";
import AreaGradeMatrix from "./Components/AreaGradeMatrix";
import BoulderForm from "./Components/BoulderForm";
import BoulderTable from "./Components/BoulderTable";
import ErrorState from "./Components/ErrorState";
import GradeChart from "./Components/GradeChart";
import LoadingState from "./Components/LoadingState";
import SummaryStrip from "./Components/SummaryStrip";
import type { BoulderCreateRequest, BouldersResponse, GradeField } from "./Types/boulderTypes";

const GRADE_FIELD_LABELS: Record<GradeField, string> = {
  grade_27crags: "27Crags grade",
  guide_grade: "Guide grade",
  my_grade: "My grade"
};

function formatRefreshTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [data, setData] = useState<BouldersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeGradeField, setActiveGradeField] = useState<GradeField>("my_grade");

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

  const activeGradeLabel = GRADE_FIELD_LABELS[activeGradeField];

  const handleAddBoulder = async (request: BoulderCreateRequest) => {
    setIsSaving(true);
    try {
      const payload = await addBoulder(request);
      setData(payload);
      setError(null);
      setLastUpdated(formatRefreshTime());
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
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
                  {(Object.keys(GRADE_FIELD_LABELS) as GradeField[]).map((field) => (
                    <button
                      className={field === activeGradeField ? "active" : ""}
                      key={field}
                      type="button"
                      onClick={() => setActiveGradeField(field)}
                    >
                      {GRADE_FIELD_LABELS[field]}
                    </button>
                  ))}
                </div>
              </section>

              <div className="insight-grid">
                <GradeChart
                  title={`Boulders by ${activeGradeLabel.toLowerCase()}`}
                  data={data.stats.grade_counts[activeGradeField]}
                />
                <AreaChart
                  data={data.stats.area_counts_by_grade_source[activeGradeField]}
                  gradeSourceLabel={activeGradeLabel}
                />
              </div>

              <AreaGradeMatrix
                rows={data.stats.area_grade_matrix_by_grade_source[activeGradeField]}
                grades={data.grade_order}
                gradeSourceLabel={activeGradeLabel}
              />
              <BoulderTable records={data.records} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
