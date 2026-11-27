import { apiJson } from "./apiClient";
import type { AscentComment, BoulderMedia, BoulderRecord } from "../Types/boulderTypes";

export type FeedItem =
  | { kind: "ascent"; record: BoulderRecord; comments: AscentComment[] }
  | { kind: "video"; media: BoulderMedia };

export type FeedResponse = { items: FeedItem[] };

export function fetchFeed(): Promise<FeedResponse> {
  return apiJson<FeedResponse>("/api/feed", {}, "Feed request failed");
}
