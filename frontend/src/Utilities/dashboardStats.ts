import type {
  AreaCount,
  BoulderPageIdentity,
  BoulderRecord,
  DashboardStats,
  GradeField
} from "../Types/boulderTypes";

export function isSameBoulder(
  record: BoulderRecord,
  identity: BoulderPageIdentity
): boolean {
  return (
    record.name.trim().toLocaleLowerCase() === identity.name.trim().toLocaleLowerCase() &&
    record.area.trim().toLocaleLowerCase() === identity.area.trim().toLocaleLowerCase() &&
    record.sector.trim().toLocaleLowerCase() === identity.sector.trim().toLocaleLowerCase()
  );
}

export function buildStats(records: BoulderRecord[], gradeOrder: string[]): DashboardStats {
  const flashCount = records.filter((record) => record.flash).length;
  return {
    total: records.length,
    flash_count: flashCount,
    flash_rate: records.length === 0 ? 0 : flashCount / records.length,
    areas: areaCounts(records),
    grade_counts: {
      grade_27crags: orderedGradeCounts(records, "grade_27crags", gradeOrder),
      guide_grade: orderedGradeCounts(records, "guide_grade", gradeOrder),
      own_grade: orderedGradeCounts(records, "own_grade", gradeOrder)
    },
    area_counts_by_grade_source: {
      grade_27crags: areaCounts(records, "grade_27crags"),
      guide_grade: areaCounts(records, "guide_grade"),
      own_grade: areaCounts(records, "own_grade")
    },
    area_grade_matrix_by_grade_source: {
      grade_27crags: areaGradeMatrix(records, "grade_27crags"),
      guide_grade: areaGradeMatrix(records, "guide_grade"),
      own_grade: areaGradeMatrix(records, "own_grade")
    }
  };
}

export function recordMatchesSearch(record: BoulderRecord, searchQuery: string): boolean {
  const query = searchQuery.trim().toLocaleLowerCase();
  if (!query) {
    return true;
  }
  return [
    record.name,
    record.area,
    record.sector,
    record.climber,
    record.climber_display_name,
    record.grade_27crags,
    record.guide_grade,
    record.own_grade,
    record.climbed_on ?? "",
    record.flash ? "flash" : "",
    record.visibility,
    record.rating === null ? "" : `${record.rating}/5`
  ]
    .join(" ")
    .toLocaleLowerCase()
    .includes(query);
}

function orderedGradeCounts(records: BoulderRecord[], field: GradeField, gradeOrder: string[]) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const grade = record[field];
    if (grade) {
      counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }
  }
  const known = gradeOrder
    .filter((grade) => counts.has(grade))
    .map((grade) => ({ grade, count: counts.get(grade) ?? 0 }));
  const unknown = Array.from(counts.entries())
    .filter(([grade]) => !gradeOrder.includes(grade))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([grade, count]) => ({ grade, count }));
  return known.concat(unknown);
}

function areaCounts(records: BoulderRecord[], gradeField?: GradeField): AreaCount[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (!record.area || (gradeField && !record[gradeField])) {
      continue;
    }
    counts.set(record.area, (counts.get(record.area) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((left, right) => right.count - left.count);
}

function areaGradeMatrix(
  records: BoulderRecord[],
  gradeField: GradeField
): Array<Record<string, number | string>> {
  const matrix = new Map<string, Map<string, number>>();
  for (const record of records) {
    const grade = record[gradeField];
    if (!record.area || !grade) {
      continue;
    }
    const gradeCounts = matrix.get(record.area) ?? new Map<string, number>();
    gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1);
    matrix.set(record.area, gradeCounts);
  }
  return Array.from(matrix.entries())
    .map(([area, gradeCounts]) => {
      const row: Record<string, number | string> = { area };
      let total = 0;
      for (const [grade, count] of gradeCounts.entries()) {
        row[grade] = count;
        total += count;
      }
      row.total = total;
      return row;
    })
    .sort((left, right) => Number(right.total) - Number(left.total));
}
