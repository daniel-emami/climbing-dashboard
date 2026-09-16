import AreaChart from "./AreaChart";
import AreaGradeMatrix from "./AreaGradeMatrix";
import ErrorState from "./ErrorState";
import GradeChart, { type GradeChartSeries } from "./GradeChart";
import LoadingState from "./LoadingState";
import ActivityFeed from "../Features/ActivityFeed";
import { BoulderTable } from "../Features/Logbook";
import { GRADE_SOURCE_LABELS } from "../Config/gradeSources";
import type { DashboardPage } from "../Routing/hashRoutes";
import type {
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderPageIdentity,
  BouldersResponse,
  GradeField
} from "../Types/boulderTypes";
import styles from "../App.module.css";

type DashboardPageContentProps = {
  activeAreaMapGradeField: GradeField;
  activeAreaMapGradeLabel: string;
  activePage: DashboardPage;
  currentDisplayName: string | null;
  currentUsername: string | null;
  error: string | null;
  gradeChartSeries: GradeChartSeries[];
  gradeChartTitle: string;
  isInitialLoading: boolean;
  isSaving: boolean;
  onDeleteBoulder: (request: BoulderIdentity) => Promise<void>;
  onError: (message: string | null) => void;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
  onOpenBoulderer: (username: string) => void;
  onUpdateBoulder: (
    original: BoulderIdentity,
    boulder: BoulderCreateRequest
  ) => Promise<void>;
  visibleData: BouldersResponse | null;
};

export default function DashboardPageContent({
  activeAreaMapGradeField,
  activeAreaMapGradeLabel,
  activePage,
  currentDisplayName,
  currentUsername,
  error,
  gradeChartSeries,
  gradeChartTitle,
  isInitialLoading,
  isSaving,
  onDeleteBoulder,
  onError,
  onOpenBoulder,
  onOpenBoulderer,
  onUpdateBoulder,
  visibleData
}: DashboardPageContentProps) {
  return (
    <section className={styles.dashboardMain} aria-label="Climbing Dashboard">
      {isInitialLoading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {visibleData && !isInitialLoading && (
        <>
          {activePage === "feed" && (
            <>
              <ActivityFeed
                currentUsername={currentUsername}
                selectedClimber=""
                records={visibleData.records}
                onError={onError}
                onOpenBoulder={onOpenBoulder}
                onOpenBoulderer={onOpenBoulderer}
              />
              <div className={styles.insightGrid}>
                <GradeChart
                  title={gradeChartTitle}
                  gradeOrder={visibleData.grade_order}
                  series={gradeChartSeries}
                />
                <AreaChart
                  data={visibleData.stats.area_counts_by_grade_source.own_grade}
                  gradeSourceLabel={GRADE_SOURCE_LABELS.own_grade}
                />
              </div>
            </>
          )}

          {activePage === "logbook" && (
            <BoulderTable
              records={visibleData.records}
              gradeOrder={visibleData.grade_order}
              isSaving={isSaving}
              currentDisplayName={currentDisplayName}
              currentUsername={currentUsername}
              onDelete={onDeleteBoulder}
              onOpenBoulder={onOpenBoulder}
              onOpenBoulderer={onOpenBoulderer}
              onUpdate={onUpdateBoulder}
            />
          )}

          {activePage === "map" && (
            <AreaGradeMatrix
              rows={visibleData.stats.area_grade_matrix_by_grade_source[activeAreaMapGradeField]}
              grades={visibleData.grade_order}
              gradeSourceLabel={activeAreaMapGradeLabel}
            />
          )}
        </>
      )}
    </section>
  );
}
