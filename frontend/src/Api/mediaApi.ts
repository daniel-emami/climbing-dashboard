import { apiForm, apiJson, apiUrl } from "./apiClient";
import type {
  BoulderMediaResponse,
  BoulderMediaUploadRequest,
  BoulderPageIdentity
} from "../Types/boulderTypes";

export function mediaUrl(path: string): string {
  return apiUrl(path);
}

export async function fetchBoulderMedia(
  identity: BoulderPageIdentity
): Promise<BoulderMediaResponse> {
  const params = new URLSearchParams({
    name: identity.name,
    area: identity.area,
    sector: identity.sector
  });
  return apiJson<BoulderMediaResponse>(
    `/api/boulders/media?${params.toString()}`,
    {},
    "Media request failed"
  );
}

export async function fetchRecentBoulderMedia(limit = 30): Promise<BoulderMediaResponse> {
  const params = new URLSearchParams({
    limit: String(limit)
  });
  return apiJson<BoulderMediaResponse>(
    `/api/boulders/media/recent?${params.toString()}`,
    {},
    "Media request failed"
  );
}

export async function uploadBoulderVideo(
  request: BoulderMediaUploadRequest
): Promise<BoulderMediaResponse> {
  const formData = new FormData();
  formData.append("name", request.name);
  formData.append("area", request.area);
  formData.append("sector", request.sector);
  formData.append("caption", request.caption);
  formData.append("file", request.file);

  return apiForm<BoulderMediaResponse>(
    "/api/boulders/media",
    formData,
    { method: "POST" },
    "Media request failed"
  );
}

export async function deleteBoulderMedia(mediaId: number): Promise<BoulderMediaResponse> {
  return apiJson<BoulderMediaResponse>(
    `/api/boulders/media/${mediaId}`,
    { method: "DELETE" },
    "Media request failed"
  );
}
