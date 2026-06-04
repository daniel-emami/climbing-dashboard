export type BoulderRecord = {
  name: string;
  grade_27crags: string;
  guide_grade: string;
  min_grade: string;
  area: string;
  flash: boolean;
  climbed_on: string | null;
};

export type GradeCount = {
  grade: string;
  count: number;
};

export type AreaCount = {
  area: string;
  count: number;
};

export type DashboardStats = {
  total: number;
  flash_count: number;
  flash_rate: number;
  areas: AreaCount[];
  grade_counts: {
    grade_27crags: GradeCount[];
    guide_grade: GradeCount[];
    min_grade: GradeCount[];
  };
  area_grade_matrix: Array<Record<string, number | string>>;
};

export type BouldersResponse = {
  records: BoulderRecord[];
  stats: DashboardStats;
  grade_order: string[];
};

export type BoulderCreateRequest = {
  name: string;
  grade_27crags: string;
  guide_grade: string;
  min_grade: string;
  area: string;
  flash: boolean;
  climbed_on: string | null;
};

export type GradeField = "grade_27crags" | "guide_grade" | "min_grade";
