export type BoulderRecord = {
  name: string;
  grade_27crags: string;
  guide_grade: string;
  own_grade: string;
  area: string;
  sector: string;
  climber: string;
  flash: boolean;
  climbed_on: string | null;
  rating: number | null;
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
    own_grade: GradeCount[];
  };
  area_counts_by_grade_source: {
    grade_27crags: AreaCount[];
    guide_grade: AreaCount[];
    own_grade: AreaCount[];
  };
  area_grade_matrix_by_grade_source: {
    grade_27crags: Array<Record<string, number | string>>;
    guide_grade: Array<Record<string, number | string>>;
    own_grade: Array<Record<string, number | string>>;
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
  own_grade: string;
  area: string;
  sector: string;
  climber: string;
  flash: boolean;
  climbed_on: string | null;
  rating: number | null;
};

export type BoulderIdentity = {
  name: string;
  area: string;
  sector: string;
  climber: string;
};

export type BoulderPageIdentity = {
  name: string;
  area: string;
  sector: string;
};

export type BoulderComment = {
  id: number;
  boulder_name: string;
  area: string;
  sector: string;
  climber: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type BoulderCommentsResponse = {
  comments: BoulderComment[];
};

export type BoulderCommentCreateRequest = {
  name: string;
  area: string;
  sector: string;
  climber: string;
  body: string;
};

export type BoulderCommentUpdateRequest = {
  climber: string;
  body: string;
};

export type BoulderUpdateRequest = {
  original: BoulderIdentity;
  boulder: BoulderCreateRequest;
};

export type GradeField = "grade_27crags" | "guide_grade" | "own_grade";
