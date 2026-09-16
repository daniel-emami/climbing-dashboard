import type { BoulderCreateRequest, BoulderRecord } from "../../Types/boulderTypes";

export type BoulderTableSortKey =
  | "name"
  | "area"
  | "sector"
  | "climber"
  | "grade_27crags"
  | "guide_grade"
  | "own_grade"
  | "flash"
  | "climbed_on"
  | "rating"
  | "visibility";

export type BoulderTableSortDirection = "asc" | "desc";

export type BoulderTableSortState = {
  key: BoulderTableSortKey;
  direction: BoulderTableSortDirection;
};

export const BOULDER_TABLE_HEADERS: Array<{ key: BoulderTableSortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "area", label: "Area" },
  { key: "sector", label: "Sector" },
  { key: "climber", label: "Climber" },
  { key: "visibility", label: "Visible" },
  { key: "grade_27crags", label: "27Crags" },
  { key: "guide_grade", label: "Guide" },
  { key: "own_grade", label: "Own" },
  { key: "flash", label: "Flash" },
  { key: "climbed_on", label: "Date" },
  { key: "rating", label: "Rating" }
];

export const BOULDER_TABLE_PAGE_SIZE = 15;

export function boulderTableRecordKey(record: BoulderRecord): string {
  return `${record.name}::${record.area}::${record.sector}::${record.climber}`;
}

export function boulderRecordToDraft(record: BoulderRecord): BoulderCreateRequest {
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

export function compareBoulderTableRecords(
  left: BoulderRecord,
  right: BoulderRecord,
  sortKey: BoulderTableSortKey,
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

export function formatBoulderTableLocation(record: BoulderRecord): string {
  return [record.area, record.sector].filter(Boolean).join(" / ");
}

export function formatBoulderTableRating(rating: number | null): string {
  return rating ? `${rating}/5` : "";
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
