import { useMemo, useState } from "react";
import { GRADE_SOURCE_LABELS } from "../../Config/gradeSources";
import type { GradeCount, GradeField } from "../../Types/boulderTypes";
import sharedStyles from "../../Styles/Shared.module.css";
import styles from "./BouldererProfilePage.module.css";

type BouldererGradeDistributionPanelProps = {
  gradeCountsBySource: Record<GradeField, GradeCount[]>;
};

export default function BouldererGradeDistributionPanel({
  gradeCountsBySource
}: BouldererGradeDistributionPanelProps) {
  const [gradeSource, setGradeSource] = useState<GradeField>("own_grade");
  const gradeCounts = gradeCountsBySource[gradeSource];
  const largestGradeCount = useMemo(
    () => Math.max(1, ...gradeCounts.map((entry) => entry.count)),
    [gradeCounts]
  );

  return (
    <section className={`${sharedStyles.panel} ${styles.gridPanel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>
          {GRADE_SOURCE_LABELS[gradeSource]} grade distribution
        </span>
      </div>
      {gradeCounts.length === 0 ? (
        <div className={sharedStyles.emptyDetailSlot}>No graded ascents</div>
      ) : (
        <ol className={styles.gradeBars}>
          {gradeCounts.map((entry) => (
            <li key={entry.grade}>
              <span>{entry.grade}</span>
              <div>
                <i style={{ width: `${(entry.count / largestGradeCount) * 100}%` }} />
              </div>
              <strong>{entry.count}</strong>
            </li>
          ))}
        </ol>
      )}
      <div
        className={`${sharedStyles.segmentedControl} ${styles.gradeSourceControl}`}
        role="group"
        aria-label="Profile grade source"
      >
        {(["grade_27crags", "guide_grade", "own_grade"] as GradeField[]).map((source) => (
          <button
            className={gradeSource === source ? sharedStyles.active : ""}
            key={source}
            type="button"
            onClick={() => setGradeSource(source)}
          >
            {GRADE_SOURCE_LABELS[source]}
          </button>
        ))}
      </div>
    </section>
  );
}
