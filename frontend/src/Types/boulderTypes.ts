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
  visibility: AscentVisibility;
  ascent_id: number | null;
  added_at: string | null;
};

export type AscentVisibility = "public" | "private";

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
  visibility: AscentVisibility;
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
  user_id: number | null;
};

export type BoulderCommentsResponse = {
  comments: BoulderComment[];
};

export type BoulderCommentCreateRequest = {
  name: string;
  area: string;
  sector: string;
  body: string;
};

export type BoulderCommentUpdateRequest = {
  body: string;
};

export type AscentComment = {
  id: number;
  ascent_id: number;
  climber: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type AscentCommentsResponse = {
  comments: AscentComment[];
};

export type AscentCommentsByAscentResponse = {
  comments_by_ascent_id: Record<string, AscentComment[]>;
};

export type AscentCommentCreateRequest = {
  ascent_id: number;
  climber: string;
  body: string;
};

export type AscentCommentUpdateRequest = {
  climber: string;
  body: string;
};

export type BoulderMedia = {
  id: number;
  boulder_name: string;
  area: string;
  sector: string;
  ascent_id: number | null;
  climber: string;
  media_type: "video";
  url: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  caption: string;
  created_at: string;
  updated_at: string;
};

export type BoulderMediaResponse = {
  media: BoulderMedia[];
};

export type BoulderMediaUploadRequest = {
  name: string;
  area: string;
  sector: string;
  climber: string;
  caption: string;
  file: File;
};

export type BoulderUpdateRequest = {
  original: BoulderIdentity;
  boulder: BoulderCreateRequest;
};

export type GradeField = "grade_27crags" | "guide_grade" | "own_grade";
