import type { BouldererProfile } from "../Types/bouldererTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function parseProfileResponse(response: Response): Promise<BouldererProfile> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Profile request failed with ${response.status}`);
  }
  return response.json() as Promise<BouldererProfile>;
}

export function profilePictureUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

export async function fetchBouldererProfile(username: string): Promise<BouldererProfile> {
  const response = await fetch(
    `${API_BASE_URL}/api/boulderers/${encodeURIComponent(username)}`,
    { credentials: "include" }
  );
  return parseProfileResponse(response);
}

export async function updateBouldererProfile(
  username: string,
  displayName: string
): Promise<BouldererProfile> {
  const response = await fetch(
    `${API_BASE_URL}/api/boulderers/${encodeURIComponent(username)}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName })
    }
  );
  return parseProfileResponse(response);
}

export async function uploadProfilePicture(
  username: string,
  file: File
): Promise<BouldererProfile> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `${API_BASE_URL}/api/boulderers/${encodeURIComponent(username)}/profile-picture`,
    {
      method: "POST",
      credentials: "include",
      body: formData
    }
  );
  return parseProfileResponse(response);
}
