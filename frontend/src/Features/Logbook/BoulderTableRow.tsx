import { RATING_OPTIONS } from "../../Config/ratings";
import type {
  BoulderCreateRequest,
  BoulderPageIdentity,
  BoulderRecord
} from "../../Types/boulderTypes";
import {
  formatBoulderTableRating
} from "./BoulderTableUtils";
import styles from "./BoulderTable.module.css";

type BoulderTableRowProps = {
  canChange: boolean;
  currentDisplayName: string | null;
  currentUsername: string | null;
  draft: BoulderCreateRequest;
  isEditing: boolean;
  isSaving: boolean;
  record: BoulderRecord;
  onCancelEditing: () => void;
  onDelete: (record: BoulderRecord) => void;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
  onOpenBoulderer: (username: string) => void;
  onSave: (record: BoulderRecord) => void;
  onStartEditing: (record: BoulderRecord) => void;
  onUpdateDraft: <K extends keyof BoulderCreateRequest>(
    key: K,
    value: BoulderCreateRequest[K]
  ) => void;
};

export default function BoulderTableRow({
  canChange,
  currentDisplayName,
  currentUsername,
  draft,
  isEditing,
  isSaving,
  record,
  onCancelEditing,
  onDelete,
  onOpenBoulder,
  onOpenBoulderer,
  onSave,
  onStartEditing,
  onUpdateDraft
}: BoulderTableRowProps) {
  const editableRecord = isEditing ? draft : record;

  return (
    <tr key={`${record.name}-${record.area}-${record.sector}-${record.climber}-${record.climbed_on}`}>
      <th>
        {isEditing ? (
          <input
            aria-label="Boulder name"
            className={styles.inlineInput}
            required
            value={editableRecord.name}
            onChange={(event) => onUpdateDraft("name", event.target.value)}
          />
        ) : (
          <button
            className={styles.tableLink}
            type="button"
            onClick={() =>
              onOpenBoulder({
                name: record.name,
                area: record.area,
                sector: record.sector
              })
            }
          >
            {record.name}
          </button>
        )}
      </th>
      <td>
        {isEditing ? (
          <input
            aria-label="Area"
            className={styles.inlineInput}
            required
            value={editableRecord.area}
            onChange={(event) => onUpdateDraft("area", event.target.value)}
          />
        ) : (
          record.area
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            aria-label="Sector"
            className={styles.inlineInput}
            value={editableRecord.sector}
            onChange={(event) => onUpdateDraft("sector", event.target.value)}
          />
        ) : (
          record.sector
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            aria-label="Climber"
            className={styles.inlineInput}
            disabled
            required
            value={currentDisplayName ?? currentUsername ?? editableRecord.climber}
          />
        ) : (
          <button
            className={styles.tableLink}
            type="button"
            onClick={() => onOpenBoulderer(record.climber)}
          >
            {record.climber_display_name}
          </button>
        )}
      </td>
      <td>
        {isEditing ? (
          <select
            aria-label="Visibility"
            className={styles.inlineInput}
            value={editableRecord.visibility}
            onChange={(event) =>
              onUpdateDraft(
                "visibility",
                event.target.value as BoulderCreateRequest["visibility"]
              )
            }
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        ) : (
          record.visibility
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            aria-label="27Crags grade"
            className={styles.inlineInput}
            value={editableRecord.grade_27crags}
            onChange={(event) => onUpdateDraft("grade_27crags", event.target.value)}
          />
        ) : (
          record.grade_27crags
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            aria-label="Guide grade"
            className={styles.inlineInput}
            value={editableRecord.guide_grade}
            onChange={(event) => onUpdateDraft("guide_grade", event.target.value)}
          />
        ) : (
          record.guide_grade
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            aria-label="Own grade"
            className={styles.inlineInput}
            value={editableRecord.own_grade}
            onChange={(event) => onUpdateDraft("own_grade", event.target.value)}
          />
        ) : (
          record.own_grade
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            aria-label="Flash"
            className={styles.inlineCheckbox}
            checked={editableRecord.flash}
            type="checkbox"
            onChange={(event) => onUpdateDraft("flash", event.target.checked)}
          />
        ) : record.flash ? (
          "Yes"
        ) : (
          ""
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            aria-label="Climbed date"
            className={styles.inlineInput}
            type="date"
            value={editableRecord.climbed_on ?? ""}
            onChange={(event) => onUpdateDraft("climbed_on", event.target.value)}
          />
        ) : (
          record.climbed_on ?? ""
        )}
      </td>
      <td>
        {isEditing ? (
          <select
            aria-label="Rating"
            className={styles.inlineInput}
            value={editableRecord.rating ?? ""}
            onChange={(event) =>
              onUpdateDraft(
                "rating",
                event.target.value ? Number(event.target.value) : null
              )
            }
          >
            <option value="">Unrated</option>
            {RATING_OPTIONS.map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        ) : (
          formatBoulderTableRating(record.rating)
        )}
      </td>
      <td>
        <div className={styles.actionButtons}>
          {isEditing ? (
            <>
              <button disabled={isSaving || !canChange} type="button" onClick={() => onSave(record)}>
                Save
              </button>
              <button disabled={isSaving} type="button" onClick={onCancelEditing}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                disabled={isSaving || !canChange}
                type="button"
                onClick={() => onStartEditing(record)}
              >
                Edit
              </button>
              <button
                className={styles.dangerButton}
                disabled={isSaving || !canChange}
                type="button"
                onClick={() => onDelete(record)}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
