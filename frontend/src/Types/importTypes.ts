import type { BoulderRecord } from "./boulderTypes";

export type ImportPreviewResponse = {
  source: string;
  username: string;
  imported_count: number;
  skipped_count: number;
  boulders: BoulderRecord[];
};

export type ImportConfirmRequest = {
  source: string;
  boulders: BoulderRecord[];
};
