import type { BoulderPageIdentity, BoulderRecord } from "../Types/boulderTypes";

export function boulderIdentityFromRecord(record: BoulderRecord): BoulderPageIdentity {
  return { name: record.name, area: record.area, sector: record.sector };
}

export function displayDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString([], { day: "2-digit", month: "short", year: "2-digit" });
}

export function locationLabel(record: BoulderRecord): string {
  return [record.area, record.sector].filter(Boolean).join(" / ");
}

export function ownGradeLabel(record: BoulderRecord): string {
  return record.own_grade || record.grade_27crags || record.guide_grade || "-";
}
