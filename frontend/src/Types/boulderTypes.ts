export type BoulderRecord = {
  name: string;
  grade_27crags: string;
  guide_grade: string;
  my_grade: string;
  area: string;
  climber: string;
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
    my_grade: GradeCount[];
  };
  area_counts_by_grade_source: {
    grade_27crags: AreaCount[];
    guide_grade: AreaCount[];
    my_grade: AreaCount[];
  };
  area_grade_matrix_by_grade_source: {
    grade_27crags: Array<Record<string, number | string>>;
    guide_grade: Array<Record<string, number | string>>;
    my_grade: Array<Record<string, number | string>>;
  };
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
  my_grade: string;
  area: string;
  climber: string;
  flash: boolean;
  climbed_on: string | null;
};

export type BoulderIdentity = {
  name: string;
  area: string;
  climber: string;
};

export type BoulderUpdateRequest = {
  original: BoulderIdentity;
  boulder: BoulderCreateRequest;
};

export type GradeField = "grade_27crags" | "guide_grade" | "my_grade";
