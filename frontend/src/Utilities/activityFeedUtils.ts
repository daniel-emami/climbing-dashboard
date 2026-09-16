import type { BoulderMedia, BoulderPageIdentity, BoulderRecord } from "../Types/boulderTypes";

export function parsedDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalizedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function timestamp(value: string | null): number {
  return parsedDate(value)?.getTime() ?? 0;
}

export function ascentTimestamp(record: BoulderRecord): number {
  return timestamp(record.climbed_on) || timestamp(record.added_at);
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = parsedDate(value);
  if (!parsed) {
    return value;
  }
  return parsed.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatDateTime(value: string): string {
  const parsed = parsedDate(value);
  if (!parsed) {
    return value.replace("T", " ").slice(0, 16);
  }
  return parsed.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatLocation(record: BoulderRecord): string {
  return [record.area, record.sector].filter(Boolean).join(" / ");
}

export function formatMediaLocation(media: BoulderMedia): string {
  return [media.area, media.sector].filter(Boolean).join(" / ");
}

export function formatGrade(record: BoulderRecord): string {
  const grades = [
    record.own_grade ? `Own ${record.own_grade}` : "",
    record.grade_27crags ? `27Crags ${record.grade_27crags}` : "",
    record.guide_grade ? `Guide ${record.guide_grade}` : ""
  ].filter(Boolean);
  return grades.length > 0 ? grades.join(" · ") : "Ungraded";
}

export function formatRating(rating: number | null): string {
  return rating === null ? "" : `${rating}/5`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+|_/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function boulderKey(name: string, area: string, sector: string): string {
  return [name, area, sector].map((value) => value.trim().toLocaleLowerCase()).join("|");
}

export function boulderIdentityFromRecord(record: BoulderRecord): BoulderPageIdentity {
  return {
    name: record.name,
    area: record.area,
    sector: record.sector
  };
}

export function boulderIdentityFromMedia(media: BoulderMedia): BoulderPageIdentity {
  return {
    name: media.boulder_name,
    area: media.area,
    sector: media.sector
  };
}

export function recordKey(record: BoulderRecord): string {
  return (
    record.ascent_id?.toString() ??
    `${record.name}-${record.area}-${record.sector}-${record.climber}-${record.added_at}-${record.climbed_on}`
  );
}
