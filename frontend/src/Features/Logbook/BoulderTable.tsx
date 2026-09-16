import { useMemo, useState } from "react";
import type {
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderPageIdentity,
  BoulderRecord
} from "../../Types/boulderTypes";
import sharedStyles from "../../Styles/Shared.module.css";
import BoulderTableRow from "./BoulderTableRow";
import {
  BOULDER_TABLE_HEADERS,
  BOULDER_TABLE_PAGE_SIZE,
  boulderRecordToDraft,
  boulderTableRecordKey,
  compareBoulderTableRecords,
  formatBoulderTableLocation,
  type BoulderTableSortKey,
  type BoulderTableSortState
} from "./BoulderTableUtils";
import styles from "./BoulderTable.module.css";

type BoulderTableProps = {
  records: BoulderRecord[];
  gradeOrder: string[];
  isSaving: boolean;
  currentDisplayName: string | null;
  currentUsername: string | null;
  onDelete: (request: BoulderIdentity) => Promise<void>;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
  onOpenBoulderer: (username: string) => void;
  onUpdate: (original: BoulderIdentity, boulder: BoulderCreateRequest) => Promise<void>;
};

export default function BoulderTable({
  records,
  gradeOrder,
  isSaving,
  currentDisplayName,
  currentUsername,
  onDelete,
  onOpenBoulder,
  onOpenBoulderer,
  onUpdate
}: BoulderTableProps) {
  const [sort, setSort] = useState<BoulderTableSortState>({
    key: "climbed_on",
    direction: "desc"
  });
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
          compareBoulderTableRecords(left, right, sort.key, gradeRank) * directionMultiplier
      );
  }, [gradeRank, records, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedRecords.length / BOULDER_TABLE_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedRecords = sortedRecords.slice(
    (currentPage - 1) * BOULDER_TABLE_PAGE_SIZE,
    currentPage * BOULDER_TABLE_PAGE_SIZE
  );
  const firstVisibleRecord =
    sortedRecords.length === 0 ? 0 : (currentPage - 1) * BOULDER_TABLE_PAGE_SIZE + 1;
  const lastVisibleRecord = Math.min(
    currentPage * BOULDER_TABLE_PAGE_SIZE,
    sortedRecords.length
  );

  const handleSort = (key: BoulderTableSortKey) => {
    setSort((current) => {
      if (current.key !== key) {
        return { key, direction: "asc" };
      }
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
    setPage(1);
  };

  const sortIndicator = (key: BoulderTableSortKey): string => {
    if (sort.key !== key) {
      return "";
    }
    return sort.direction === "asc" ? "▲" : "▼";
  };

  const startEditing = (record: BoulderRecord) => {
    setEditingKey(boulderTableRecordKey(record));
    setDraft(boulderRecordToDraft(record));
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
    if (!currentUsername) {
      window.alert("Log in before editing ascents.");
      return;
    }
    if (!draft.name.trim() || !draft.area.trim()) {
      window.alert("Name and area are required.");
      return;
    }
    try {
      await onUpdate(
        { name: record.name, area: record.area, sector: record.sector, climber: record.climber },
        {
          ...draft,
          climber: currentUsername,
          climbed_on: draft.climbed_on || null
        }
      );
      cancelEditing();
    } catch {
      return;
    }
  };

  const deleteRecord = async (record: BoulderRecord) => {
    if (!currentUsername) {
      window.alert("Log in before deleting ascents.");
      return;
    }
    const shouldDelete = window.confirm(
      `Remove ${record.name} from ${formatBoulderTableLocation(record)} for ${record.climber_display_name}?`
    );
    if (!shouldDelete) {
      return;
    }
    try {
      await onDelete({
        name: record.name,
        area: record.area,
        sector: record.sector,
        climber: record.climber
      });
      if (editingKey === boulderTableRecordKey(record)) {
        cancelEditing();
      }
    } catch {
      return;
    }
  };

  return (
    <section className={sharedStyles.panel}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Logbook</span>
        <div className={styles.pagination} aria-label="Logbook pagination">
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
      <div className={sharedStyles.tableWrap}>
        <table className={styles.table}>
          <colgroup>
            <col className={styles.nameColumn} />
            <col className={styles.areaColumn} />
            <col className={styles.sectorColumn} />
            <col className={styles.climberColumn} />
            <col className={styles.visibilityColumn} />
            <col className={styles.gradeColumn} />
            <col className={styles.gradeColumn} />
            <col className={styles.gradeColumn} />
            <col className={styles.flashColumn} />
            <col className={styles.dateColumn} />
            <col className={styles.ratingColumn} />
            <col className={styles.actionsColumn} />
          </colgroup>
          <thead>
            <tr>
              {BOULDER_TABLE_HEADERS.map((header) => (
                <th key={header.key}>
                  <button
                    className={styles.sortButton}
                    type="button"
                    onClick={() => handleSort(header.key)}
                  >
                    <span className={styles.sortLabel}>{header.label}</span>
                    <span className={styles.sortIndicator} aria-hidden="true">
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
              const isEditing = editingKey === boulderTableRecordKey(record);
              const canChange =
                currentUsername !== null &&
                record.climber.toLocaleLowerCase() === currentUsername.toLocaleLowerCase();

              return (
                <BoulderTableRow
                  canChange={canChange}
                  currentDisplayName={currentDisplayName}
                  currentUsername={currentUsername}
                  draft={draft ?? boulderRecordToDraft(record)}
                  isEditing={isEditing}
                  isSaving={isSaving}
                  key={`${record.name}-${record.area}-${record.sector}-${record.climber}-${record.climbed_on}`}
                  record={record}
                  onCancelEditing={cancelEditing}
                  onDelete={(nextRecord) => void deleteRecord(nextRecord)}
                  onOpenBoulder={onOpenBoulder}
                  onOpenBoulderer={onOpenBoulderer}
                  onSave={(nextRecord) => void saveEditing(nextRecord)}
                  onStartEditing={startEditing}
                  onUpdateDraft={updateDraft}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
