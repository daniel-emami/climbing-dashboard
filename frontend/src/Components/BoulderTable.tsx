import { useMemo, useState } from "react";
import type {
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderPageIdentity,
  BoulderRecord
} from "../Types/boulderTypes";

type BoulderTableProps = {
  records: BoulderRecord[];
  gradeOrder: string[];
  isSaving: boolean;
  onDelete: (request: BoulderIdentity) => Promise<void>;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
  onUpdate: (original: BoulderIdentity, boulder: BoulderCreateRequest) => Promise<void>;
};

type SortKey =
  | "name"
  | "area"
  | "climber"
  | "grade_27crags"
  | "guide_grade"
  | "own_grade"
  | "flash"
  | "climbed_on"
  | "rating";

type SortDirection = "asc" | "desc";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

const HEADERS: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "area", label: "Area" },
  { key: "climber", label: "Climber" },
  { key: "grade_27crags", label: "27Crags" },
  { key: "guide_grade", label: "Guide" },
  { key: "own_grade", label: "Own" },
  { key: "flash", label: "Flash" },
  { key: "climbed_on", label: "Date" },
  { key: "rating", label: "Rating" }
];

const PAGE_SIZE = 15;
const RATING_OPTIONS = [1, 2, 3, 4, 5];

function recordKey(record: BoulderRecord): string {
  return `${record.name}::${record.area}::${record.climber}`;
}

function recordToDraft(record: BoulderRecord): BoulderCreateRequest {
  return {
    name: record.name,
    grade_27crags: record.grade_27crags,
    guide_grade: record.guide_grade,
    own_grade: record.own_grade,
    area: record.area,
    climber: record.climber,
    flash: record.flash,
    climbed_on: record.climbed_on,
    rating: record.rating
  };
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function compareGrades(left: string, right: string, gradeRank: Map<string, number>): number {
  const leftRank = gradeRank.get(left);
  const rightRank = gradeRank.get(right);
  if (leftRank !== undefined && rightRank !== undefined) {
    return leftRank - rightRank;
  }
  if (leftRank !== undefined) {
    return -1;
  }
  if (rightRank !== undefined) {
    return 1;
  }
  return compareText(left, right);
}

function compareRecords(
  left: BoulderRecord,
  right: BoulderRecord,
  sortKey: SortKey,
  gradeRank: Map<string, number>
): number {
  if (sortKey === "flash") {
    return Number(left.flash) - Number(right.flash);
  }
  if (sortKey === "rating") {
    return (left.rating ?? 0) - (right.rating ?? 0);
  }
  if (sortKey === "climbed_on") {
    return compareText(left.climbed_on ?? "", right.climbed_on ?? "");
  }
  if (sortKey === "grade_27crags" || sortKey === "guide_grade" || sortKey === "own_grade") {
    return compareGrades(left[sortKey], right[sortKey], gradeRank);
  }
  return compareText(left[sortKey], right[sortKey]);
}

function formatRating(rating: number | null): string {
  return rating ? `${rating}/5` : "";
}

export default function BoulderTable({
  records,
  gradeOrder,
  isSaving,
  onDelete,
  onOpenBoulder,
  onUpdate
}: BoulderTableProps) {
  const [sort, setSort] = useState<SortState>({ key: "climbed_on", direction: "desc" });
  const [page, setPage] = useState(1);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<BoulderCreateRequest | null>(null);
  const gradeRank = useMemo(
    () => new Map(gradeOrder.map((grade, index) => [grade, index])),
    [gradeOrder]
  );

  const sortedRecords = useMemo(() => {
    const directionMultiplier = sort.direction === "asc" ? 1 : -1;
    return records
      .slice()
      .sort(
        (left, right) =>
          compareRecords(left, right, sort.key, gradeRank) * directionMultiplier
      );
  }, [gradeRank, records, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedRecords = sortedRecords.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const firstVisibleRecord = sortedRecords.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastVisibleRecord = Math.min(currentPage * PAGE_SIZE, sortedRecords.length);

  const handleSort = (key: SortKey) => {
    setSort((current) => {
      if (current.key !== key) {
        return { key, direction: "asc" };
      }
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
    setPage(1);
  };

  const sortIndicator = (key: SortKey): string => {
    if (sort.key !== key) {
      return "";
    }
    return sort.direction === "asc" ? "▲" : "▼";
  };

  const startEditing = (record: BoulderRecord) => {
    setEditingKey(recordKey(record));
    setDraft(recordToDraft(record));
  };

  const updateDraft = <K extends keyof BoulderCreateRequest>(
    key: K,
    value: BoulderCreateRequest[K]
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setDraft(null);
  };

  const saveEditing = async (record: BoulderRecord) => {
    if (!draft) {
      return;
    }
    if (!draft.name.trim() || !draft.area.trim() || !draft.climber.trim()) {
      window.alert("Name, area, and climber are required.");
      return;
    }
    try {
      await onUpdate(
        { name: record.name, area: record.area, climber: record.climber },
        {
          ...draft,
          climbed_on: draft.climbed_on || null
        }
      );
      cancelEditing();
    } catch {
      return;
    }
  };

  const deleteRecord = async (record: BoulderRecord) => {
    const shouldDelete = window.confirm(
      `Remove ${record.name} from ${record.area} for ${record.climber}?`
    );
    if (!shouldDelete) {
      return;
    }
    try {
      await onDelete({ name: record.name, area: record.area, climber: record.climber });
      if (editingKey === recordKey(record)) {
        cancelEditing();
      }
    } catch {
      return;
    }
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <span className="section-kicker">Logbook</span>
        <div className="pagination-controls" aria-label="Logbook pagination">
          <span>
            {firstVisibleRecord}-{lastVisibleRecord} of {sortedRecords.length}
          </span>
          <button
            disabled={currentPage === 1}
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <button
            disabled={currentPage === pageCount}
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
            Next
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="logbook-table">
          <colgroup>
            <col className="logbook-name-column" />
            <col className="logbook-area-column" />
            <col className="logbook-climber-column" />
            <col className="logbook-grade-column" />
            <col className="logbook-grade-column" />
            <col className="logbook-grade-column" />
            <col className="logbook-flash-column" />
            <col className="logbook-date-column" />
            <col className="logbook-rating-column" />
            <col className="logbook-actions-column" />
          </colgroup>
          <thead>
            <tr>
              {HEADERS.map((header) => (
                <th key={header.key}>
                  <button
                    className="table-sort-button"
                    type="button"
                    onClick={() => handleSort(header.key)}
                  >
                    <span className="table-sort-label">{header.label}</span>
                    <span className="table-sort-indicator" aria-hidden="true">
                      {sortIndicator(header.key)}
                    </span>
                  </button>
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRecords.map((record) => {
              const isEditing = editingKey === recordKey(record);
              const editableRecord = isEditing && draft ? draft : record;

              return (
                <tr key={`${record.name}-${record.area}-${record.climber}-${record.climbed_on}`}>
                  <th>
                    {isEditing ? (
                      <input
                        aria-label="Boulder name"
                        className="table-inline-input"
                        required
                        value={editableRecord.name}
                        onChange={(event) => updateDraft("name", event.target.value)}
                      />
                    ) : (
                      <button
                        className="table-link-button"
                        type="button"
                        onClick={() => onOpenBoulder({ name: record.name, area: record.area })}
                      >
                        {record.name}
                      </button>
                    )}
                  </th>
                  <td>
                    {isEditing ? (
                      <input
                        aria-label="Area"
                        className="table-inline-input"
                        required
                        value={editableRecord.area}
                        onChange={(event) => updateDraft("area", event.target.value)}
                      />
                    ) : (
                      record.area
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        aria-label="Climber"
                        className="table-inline-input"
                        required
                        value={editableRecord.climber}
                        onChange={(event) => updateDraft("climber", event.target.value)}
                      />
                    ) : (
                      record.climber
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        aria-label="27Crags grade"
                        className="table-inline-input"
                        value={editableRecord.grade_27crags}
                        onChange={(event) => updateDraft("grade_27crags", event.target.value)}
                      />
                    ) : (
                      record.grade_27crags
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        aria-label="Guide grade"
                        className="table-inline-input"
                        value={editableRecord.guide_grade}
                        onChange={(event) => updateDraft("guide_grade", event.target.value)}
                      />
                    ) : (
                      record.guide_grade
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        aria-label="Own grade"
                        className="table-inline-input"
                        value={editableRecord.own_grade}
                        onChange={(event) => updateDraft("own_grade", event.target.value)}
                      />
                    ) : (
                      record.own_grade
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        aria-label="Flash"
                        className="table-inline-checkbox"
                        checked={editableRecord.flash}
                        type="checkbox"
                        onChange={(event) => updateDraft("flash", event.target.checked)}
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
                        className="table-inline-input"
                        type="date"
                        value={editableRecord.climbed_on ?? ""}
                        onChange={(event) => updateDraft("climbed_on", event.target.value)}
                      />
                    ) : (
                      record.climbed_on ?? ""
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        aria-label="Rating"
                        className="table-inline-input"
                        value={editableRecord.rating ?? ""}
                        onChange={(event) =>
                          updateDraft(
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
                      formatRating(record.rating)
                    )}
                  </td>
                  <td>
                    <div className="logbook-action-buttons">
                      {isEditing ? (
                        <>
                          <button
                            disabled={isSaving}
                            type="button"
                            onClick={() => void saveEditing(record)}
                          >
                            Save
                          </button>
                          <button disabled={isSaving} type="button" onClick={cancelEditing}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            disabled={isSaving}
                            type="button"
                            onClick={() => startEditing(record)}
                          >
                            Edit
                          </button>
                          <button
                            className="danger-button"
                            disabled={isSaving}
                            type="button"
                            onClick={() => void deleteRecord(record)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
