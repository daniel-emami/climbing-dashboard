import type { BoulderCreateRequest, BouldersResponse } from "../Types/boulderTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function parseResponse(response: Response): Promise<BouldersResponse> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `API request failed with ${response.status}`);
  }
  return response.json() as Promise<BouldersResponse>;
}

export async function fetchBoulders(): Promise<BouldersResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boulders`);
  return parseResponse(response);
}

export async function addBoulder(request: BoulderCreateRequest): Promise<BouldersResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boulders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseResponse(response);
}
