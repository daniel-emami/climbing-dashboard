import type {
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderRecord
} from "../../Types/boulderTypes";
import sharedStyles from "../../Styles/Shared.module.css";
import styles from "./BoulderDetailPage.module.css";

type BoulderAscentsPanelProps = {
  currentUsername: string | null;
  isSaving: boolean;
  records: BoulderRecord[];
  onOpenBoulderer: (username: string) => void;
  onUpdate: (original: BoulderIdentity, boulder: BoulderCreateRequest) => Promise<void>;
};

const RATING_OPTIONS = [1, 2, 3, 4, 5];

function compareDates(left: string | null, right: string | null): number {
  return (left ?? "").localeCompare(right ?? "");
}

function recordToRequest(record: BoulderRecord): BoulderCreateRequest {
  return {
    name: record.name,
    grade_27crags: record.grade_27crags,
    guide_grade: record.guide_grade,
    own_grade: record.own_grade,
    area: record.area,
    sector: record.sector,
    climber: record.climber,
    flash: record.flash,
    climbed_on: record.climbed_on,
    rating: record.rating,
    visibility: record.visibility
  };
}

function RatingButtons({
  disabled,
  rating,
  onChange
}: {
  disabled: boolean;
  rating: number | null;
  onChange: (rating: number | null) => void;
}) {
  return (
    <div className={styles.ratingControl} aria-label="Rating">
      {RATING_OPTIONS.map((option) => (
        <button
          className={rating === option ? styles.activeRating : ""}
          disabled={disabled}
          key={option}
          type="button"
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
      <button
        className={styles.clearRating}
        disabled={disabled || rating === null}
        type="button"
        onClick={() => onChange(null)}
      >
        Clear
      </button>
    </div>
  );
}

export default function BoulderAscentsPanel({
  currentUsername,
  isSaving,
  records,
  onOpenBoulderer,
  onUpdate
}: BoulderAscentsPanelProps) {
  const sortedRecords = records
    .slice()
    .sort((left, right) => compareDates(right.climbed_on, left.climbed_on));

  const updateRating = async (record: BoulderRecord, rating: number | null) => {
    try {
      await onUpdate(
        {
          name: record.name,
          area: record.area,
          sector: record.sector,
          climber: record.climber
        },
        {
          ...recordToRequest(record),
          rating
        }
      );
    } catch {
      return;
    }
  };

  return (
    <section className={`${sharedStyles.panel} ${styles.fullWidthPanel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Climbers</span>
      </div>
      <div className={sharedStyles.tableWrap}>
        <table className={styles.climberTable}>
          <thead>
            <tr>
              <th>Climber</th>
              <th>Own grade</th>
              <th>27Crags</th>
              <th>Guide</th>
              <th>Flash</th>
              <th>Date</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => (
              <tr
                key={
                  record.ascent_id ??
                  `${record.climber}-${record.climbed_on}-${record.own_grade}`
                }
              >
                <th>
                  <button
                    className={styles.tableLink}
                    type="button"
                    onClick={() => onOpenBoulderer(record.climber)}
                  >
                    {record.climber_display_name || "-"}
                  </button>
                </th>
                <td>{record.own_grade}</td>
                <td>{record.grade_27crags}</td>
                <td>{record.guide_grade}</td>
                <td>{record.flash ? "Yes" : ""}</td>
                <td>{record.climbed_on ?? ""}</td>
                <td>
                  <RatingButtons
                    disabled={
                      isSaving ||
                      currentUsername === null ||
                      record.climber.toLocaleLowerCase() !==
                        currentUsername.toLocaleLowerCase()
                    }
                    rating={record.rating}
                    onChange={(rating) => void updateRating(record, rating)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
