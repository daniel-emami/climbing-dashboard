import type {
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderRecord,
  BouldersResponse,
  BoulderUpdateRequest
} from "../Types/boulderTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function parseResponse(response: Response): Promise<BouldersResponse> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `API request failed with ${response.status}`);
  }
  return response.json() as Promise<BouldersResponse>;
}

export async function fetchBoulders(): Promise<BouldersResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boulders`, {
    credentials: "include"
  });
  return parseResponse(response);
}

export async function addBoulder(request: BoulderCreateRequest): Promise<BouldersResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boulders`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseResponse(response);
}

export async function updateBoulder(request: BoulderUpdateRequest): Promise<BouldersResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boulders`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseResponse(response);
}

export async function deleteBoulder(request: BoulderIdentity): Promise<BouldersResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boulders`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseResponse(response);
}

export async function exportBoulders(records: BoulderRecord[]): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/exports/boulders`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ boulders: records })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Export failed with ${response.status}`);
  }
  return response.blob();
}
