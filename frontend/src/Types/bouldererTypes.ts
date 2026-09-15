import type { BoulderMedia, BoulderRecord, GradeCount, GradeField } from "./boulderTypes";

export type BouldererProfileUser = {
  username: string;
  display_name: string;
  profile_picture_url: string | null;
};

export type BouldererProfileStats = {
  total_ascents: number;
  flash_count: number;
  favourite_area: string | null;
  rated_ascents: number;
  average_rating: number | null;
  highest_grades: Record<GradeField, string | null>;
  grade_counts: Record<GradeField, GradeCount[]>;
};

export type BouldererProfile = {
  user: BouldererProfileUser;
  stats: BouldererProfileStats;
  recent_ascents: BoulderRecord[];
  ratings: BoulderRecord[];
  media: BoulderMedia[];
  is_owner: boolean;
  grade_order: string[];
};
