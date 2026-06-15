import type { GradeField } from "../Types/boulderTypes";

export type GradeChartMode = GradeField | "all";

export const GRADE_SOURCE_FIELDS: GradeField[] = [
  "grade_27crags",
  "guide_grade",
  "my_grade"
];

export const GRADE_SOURCE_LABELS: Record<GradeField, string> = {
  grade_27crags: "27Crags Grade",
  guide_grade: "Guide Grade",
  my_grade: "My Grade"
};

export const GRADE_SOURCE_COLORS: Record<GradeField, string> = {
  grade_27crags: "#274979",
  guide_grade: "#9f6b22",
  my_grade: "#0f766e"
};
