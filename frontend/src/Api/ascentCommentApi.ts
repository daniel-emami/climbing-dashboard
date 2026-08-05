import type {
  AscentCommentCreateRequest,
  AscentCommentsByAscentResponse,
  AscentCommentsResponse,
  AscentCommentUpdateRequest
} from "../Types/boulderTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function parseAscentCommentsResponse(
  response: Response
): Promise<AscentCommentsResponse> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Ascent comment request failed with ${response.status}`);
  }
  return response.json() as Promise<AscentCommentsResponse>;
}

export async function fetchAscentComments(
  ascentId: number
): Promise<AscentCommentsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ascents/${ascentId}/comments`);
  return parseAscentCommentsResponse(response);
}

export async function fetchAscentCommentsBatch(
  ascentIds: number[]
): Promise<AscentCommentsByAscentResponse> {
  const uniqueAscentIds = Array.from(new Set(ascentIds.filter((ascentId) => ascentId > 0)));
  const params = new URLSearchParams({
    ascent_ids: uniqueAscentIds.join(",")
  });
  const response = await fetch(`${API_BASE_URL}/api/ascents/comments?${params.toString()}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Ascent comment request failed with ${response.status}`);
  }
  return response.json() as Promise<AscentCommentsByAscentResponse>;
}

export async function addAscentComment(
  request: AscentCommentCreateRequest
): Promise<AscentCommentsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ascents/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseAscentCommentsResponse(response);
}

export async function updateAscentComment(
  commentId: number,
  request: AscentCommentUpdateRequest
): Promise<AscentCommentsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ascents/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseAscentCommentsResponse(response);
}

export async function deleteAscentComment(
  commentId: number
): Promise<AscentCommentsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ascents/comments/${commentId}`, {
    method: "DELETE"
  });
  return parseAscentCommentsResponse(response);
}
