import { apiJson, apiJsonBody } from "./apiClient";
import type {
  AscentCommentCreateRequest,
  AscentCommentsByAscentResponse,
  AscentCommentsResponse,
  AscentCommentUpdateRequest
} from "../Types/boulderTypes";

export async function fetchAscentCommentsBatch(
  ascentIds: number[]
): Promise<AscentCommentsByAscentResponse> {
  const uniqueAscentIds = Array.from(new Set(ascentIds.filter((ascentId) => ascentId > 0)));
  const params = new URLSearchParams({
    ascent_ids: uniqueAscentIds.join(",")
  });
  return apiJson<AscentCommentsByAscentResponse>(
    `/api/ascents/comments?${params.toString()}`,
    {},
    "Ascent comment request failed"
  );
}

export async function addAscentComment(
  request: AscentCommentCreateRequest
): Promise<AscentCommentsResponse> {
  return apiJsonBody<AscentCommentsResponse>(
    "/api/ascents/comments",
    request,
    { method: "POST" },
    "Ascent comment request failed"
  );
}

export async function updateAscentComment(
  commentId: number,
  request: AscentCommentUpdateRequest
): Promise<AscentCommentsResponse> {
  return apiJsonBody<AscentCommentsResponse>(
    `/api/ascents/comments/${commentId}`,
    request,
    { method: "PUT" },
    "Ascent comment request failed"
  );
}

export async function deleteAscentComment(
  commentId: number
): Promise<AscentCommentsResponse> {
  return apiJson<AscentCommentsResponse>(
    `/api/ascents/comments/${commentId}`,
    { method: "DELETE" },
    "Ascent comment request failed"
  );
}
