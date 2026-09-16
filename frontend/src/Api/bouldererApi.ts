import { apiForm, apiJson, apiJsonBody, apiUrl } from "./apiClient";
import type { BouldererProfile } from "../Types/bouldererTypes";

export function profilePictureUrl(path: string): string {
  return apiUrl(path);
}

export async function fetchBouldererProfile(username: string): Promise<BouldererProfile> {
  return apiJson<BouldererProfile>(
    `/api/boulderers/${encodeURIComponent(username)}`,
    {},
    "Profile request failed"
  );
}

export async function updateBouldererProfile(
  username: string,
  displayName: string
): Promise<BouldererProfile> {
  return apiJsonBody<BouldererProfile>(
    `/api/boulderers/${encodeURIComponent(username)}`,
    { display_name: displayName },
    { method: "PUT" },
    "Profile request failed"
  );
}

export async function uploadProfilePicture(
  username: string,
  file: File
): Promise<BouldererProfile> {
  const formData = new FormData();
  formData.append("file", file);
  return apiForm<BouldererProfile>(
    `/api/boulderers/${encodeURIComponent(username)}/profile-picture`,
    formData,
    { method: "POST" },
    "Profile request failed"
  );
}
