import type {
  BoulderCommentCreateRequest,
  BoulderCommentsResponse,
  BoulderCommentUpdateRequest,
  BoulderPageIdentity
} from "../Types/boulderTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function parseCommentsResponse(response: Response): Promise<BoulderCommentsResponse> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Comment request failed with ${response.status}`);
  }
  return response.json() as Promise<BoulderCommentsResponse>;
}

export async function fetchBoulderComments(
  identity: BoulderPageIdentity
): Promise<BoulderCommentsResponse> {
  const params = new URLSearchParams({
    name: identity.name,
    area: identity.area,
    sector: identity.sector
  });
  const response = await fetch(`${API_BASE_URL}/api/boulders/comments?${params.toString()}`, {
    credentials: "include"
  });
  return parseCommentsResponse(response);
}

export async function addBoulderComment(
  request: BoulderCommentCreateRequest
): Promise<BoulderCommentsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boulders/comments`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseCommentsResponse(response);
}

export async function updateBoulderComment(
  commentId: number,
  request: BoulderCommentUpdateRequest
): Promise<BoulderCommentsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boulders/comments/${commentId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseCommentsResponse(response);
}

export async function deleteBoulderComment(commentId: number): Promise<BoulderCommentsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boulders/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include"
  });
  return parseCommentsResponse(response);
}
