import type {
  BoulderMediaResponse,
  BoulderMediaUploadRequest,
  BoulderPageIdentity
} from "../Types/boulderTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function parseMediaResponse(response: Response): Promise<BoulderMediaResponse> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Media request failed with ${response.status}`);
  }
  return response.json() as Promise<BoulderMediaResponse>;
}

export function mediaUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

export async function fetchBoulderMedia(
  identity: BoulderPageIdentity
): Promise<BoulderMediaResponse> {
  const params = new URLSearchParams({
    name: identity.name,
    area: identity.area,
    sector: identity.sector
  });
  const response = await fetch(`${API_BASE_URL}/api/boulders/media?${params.toString()}`);
  return parseMediaResponse(response);
}

export async function fetchRecentBoulderMedia(limit = 30): Promise<BoulderMediaResponse> {
  const params = new URLSearchParams({
    limit: String(limit)
  });
  const response = await fetch(`${API_BASE_URL}/api/boulders/media/recent?${params.toString()}`);
  return parseMediaResponse(response);
}

export async function uploadBoulderVideo(
  request: BoulderMediaUploadRequest
): Promise<BoulderMediaResponse> {
  const formData = new FormData();
  formData.append("name", request.name);
  formData.append("area", request.area);
  formData.append("sector", request.sector);
  formData.append("climber", request.climber);
  formData.append("caption", request.caption);
  formData.append("file", request.file);

  const response = await fetch(`${API_BASE_URL}/api/boulders/media`, {
    method: "POST",
    body: formData
  });
  return parseMediaResponse(response);
}

export async function deleteBoulderMedia(mediaId: number): Promise<BoulderMediaResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boulders/media/${mediaId}`, {
    method: "DELETE"
  });
  return parseMediaResponse(response);
}
