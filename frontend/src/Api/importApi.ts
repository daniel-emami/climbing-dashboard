import type { BouldersResponse } from "../Types/boulderTypes";
import type { ImportConfirmRequest, ImportPreviewResponse } from "../Types/importTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `API request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function previewTheTopoImport(username: string): Promise<ImportPreviewResponse> {
  const response = await fetch(`${API_BASE_URL}/api/imports/thetopo/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username })
  });
  return parseJsonResponse<ImportPreviewResponse>(response);
}

export async function confirmTheTopoImport(
  request: ImportConfirmRequest
): Promise<BouldersResponse> {
  const response = await fetch(`${API_BASE_URL}/api/imports/thetopo/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseJsonResponse<BouldersResponse>(response);
}
