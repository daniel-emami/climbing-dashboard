import { apiJson, apiJsonBody } from "./apiClient";
import type {
  BoulderCommentCreateRequest,
  BoulderCommentsResponse,
  BoulderCommentUpdateRequest,
  BoulderPageIdentity
} from "../Types/boulderTypes";

export async function fetchBoulderComments(
  identity: BoulderPageIdentity
): Promise<BoulderCommentsResponse> {
  const params = new URLSearchParams({
    name: identity.name,
    area: identity.area,
    sector: identity.sector
  });
  return apiJson<BoulderCommentsResponse>(
    `/api/boulders/comments?${params.toString()}`,
    {},
    "Comment request failed"
  );
}

export async function addBoulderComment(
  request: BoulderCommentCreateRequest
): Promise<BoulderCommentsResponse> {
  return apiJsonBody<BoulderCommentsResponse>(
    "/api/boulders/comments",
    request,
    { method: "POST" },
    "Comment request failed"
  );
}

export async function updateBoulderComment(
  commentId: number,
  request: BoulderCommentUpdateRequest
): Promise<BoulderCommentsResponse> {
  return apiJsonBody<BoulderCommentsResponse>(
    `/api/boulders/comments/${commentId}`,
    request,
    { method: "PUT" },
    "Comment request failed"
  );
}

export async function deleteBoulderComment(commentId: number): Promise<BoulderCommentsResponse> {
  return apiJson<BoulderCommentsResponse>(
    `/api/boulders/comments/${commentId}`,
    { method: "DELETE" },
    "Comment request failed"
  );
}
