import type { GradeField } from "../Types/boulderTypes";

export type GradeChartMode = GradeField | "all";

export const GRADE_SOURCE_FIELDS: GradeField[] = [
  "grade_thetopo",
  "guide_grade",
  "own_grade"
];

export const GRADE_SOURCE_LABELS: Record<GradeField, string> = {
  grade_thetopo: "TheTopo Grade",
  guide_grade: "Guide Grade",
  own_grade: "Own Grade"
};

export const GRADE_SOURCE_COLORS: Record<GradeField, string> = {
  grade_thetopo: "var(--color-chart-grade-thetopo)",
  guide_grade: "var(--color-chart-grade-guide)",
  own_grade: "var(--color-chart-grade-own)"
};
