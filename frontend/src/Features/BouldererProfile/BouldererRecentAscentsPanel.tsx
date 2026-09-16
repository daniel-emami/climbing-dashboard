import type { BoulderPageIdentity, BoulderRecord } from "../../Types/boulderTypes";
import {
  boulderIdentityFromRecord,
  displayDate,
  locationLabel,
  ownGradeLabel
} from "../../Utilities/bouldererProfileUtils";
import sharedStyles from "../../Styles/Shared.module.css";
import styles from "./BouldererProfilePage.module.css";

type BouldererRecentAscentsPanelProps = {
  flashCount: number;
  records: BoulderRecord[];
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
};

export default function BouldererRecentAscentsPanel({
  flashCount,
  records,
  onOpenBoulder
}: BouldererRecentAscentsPanelProps) {
  return (
    <section className={`${sharedStyles.panel} ${styles.gridPanel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Recent ascents</span>
        <strong>{flashCount} flashes</strong>
      </div>
      {records.length === 0 ? (
        <div className={sharedStyles.emptyDetailSlot}>No visible ascents</div>
      ) : (
        <ol className={styles.ascentList}>
          {records.map((record) => (
            <li key={record.ascent_id ?? `${record.name}-${record.climbed_on}`}>
              <button
                type="button"
                onClick={() => onOpenBoulder(boulderIdentityFromRecord(record))}
              >
                {record.name}
              </button>
              <span>{locationLabel(record)}</span>
              <strong>{ownGradeLabel(record)}</strong>
              <time>{displayDate(record.climbed_on)}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
