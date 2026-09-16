import {
  GRADE_SOURCE_LABELS
} from "../Config/gradeSources";
import type { DashboardPage } from "../Routing/hashRoutes";
import type { GradeField } from "../Types/boulderTypes";
import styles from "../App.module.css";
import sharedStyles from "../Styles/Shared.module.css";

type DashboardToolbarProps = {
  activeAreaMapGradeField: GradeField;
  activePage: DashboardPage;
  gradeSourceFields: GradeField[];
  knownClimbers: string[];
  climberDisplayNames: Map<string, string>;
  recordCount: number;
  searchQuery: string;
  selectedClimber: string;
  onExport: () => void;
  onSearchChange: (query: string) => void;
  onSelectClimber: (climber: string) => void;
  onSelectGradeField: (field: GradeField) => void;
};

export default function DashboardToolbar({
  activeAreaMapGradeField,
  activePage,
  climberDisplayNames,
  gradeSourceFields,
  knownClimbers,
  onExport,
  onSearchChange,
  onSelectClimber,
  onSelectGradeField,
  recordCount,
  searchQuery,
  selectedClimber
}: DashboardToolbarProps) {
  if (activePage === "feed") {
    return null;
  }

  return (
    <section className={styles.toolbar} aria-label="Dashboard filters">
      <div
        className={`${styles.filterRow} ${
          activePage === "logbook" ? styles.logbookFilterRow : ""
        }`}
      >
        <label className={`${styles.filterGroup} ${styles.searchControl}`}>
          <span className={sharedStyles.sectionKicker}>Search</span>
          <div className={styles.searchFields}>
            <select
              aria-label="Filter by climber"
              value={selectedClimber}
              onChange={(event) => onSelectClimber(event.target.value)}
            >
              <option value="">All climbers</option>
              {knownClimbers.map((climber) => (
                <option key={climber} value={climber}>
                  {climberDisplayNames.get(climber) ?? climber}
                </option>
              ))}
            </select>
            <input
              aria-label="Search boulders"
              placeholder="Boulder name"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </label>

        {activePage === "map" && (
          <div className={styles.filterGroup}>
            <span className={sharedStyles.sectionKicker}>Grade Source</span>
            <div
              className={`${sharedStyles.segmentedControl} ${styles.gradeSourceOptions}`}
              role="group"
              aria-label="Grade source"
            >
              {gradeSourceFields.map((field) => (
                <button
                  className={field === activeAreaMapGradeField ? sharedStyles.active : ""}
                  key={field}
                  type="button"
                  onClick={() => onSelectGradeField(field)}
                >
                  {GRADE_SOURCE_LABELS[field]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.exportControl}>
          <button disabled={recordCount === 0} type="button" onClick={onExport}>
            Export Selected
          </button>
        </div>
      </div>
    </section>
  );
}
