import type { BoulderPageIdentity, BoulderRecord } from "../Types/boulderTypes";
import {
  boulderIdentityFromRecord,
  locationLabel
} from "../Utilities/bouldererProfileUtils";
import sharedStyles from "../Styles/Shared.module.css";
import styles from "./BouldererProfilePage.module.css";

type BouldererRatingsPanelProps = {
  ratedCount: number;
  records: BoulderRecord[];
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
};

export default function BouldererRatingsPanel({
  ratedCount,
  records,
  onOpenBoulder
}: BouldererRatingsPanelProps) {
  return (
    <section className={`${sharedStyles.panel} ${styles.gridPanel} ${styles.fullWidthPanel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Ratings</span>
        <strong>{ratedCount} rated</strong>
      </div>
      {records.length === 0 ? (
        <div className={sharedStyles.emptyDetailSlot}>No ratings yet</div>
      ) : (
        <ol className={styles.ratingList}>
          {records.map((record) => (
            <li key={record.ascent_id ?? `${record.name}-${record.rating}`}>
              <button
                type="button"
                onClick={() => onOpenBoulder(boulderIdentityFromRecord(record))}
              >
                {record.name}
              </button>
              <span>{locationLabel(record)}</span>
              <strong>{record.rating}/5</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
