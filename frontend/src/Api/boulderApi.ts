import { apiBlob, apiJson, apiJsonBody } from "./apiClient";
import type {
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderPageIdentity,
  BoulderRecord,
  BouldersResponse,
  BoulderUpdateRequest
} from "../Types/boulderTypes";

export async function fetchBoulders(): Promise<BouldersResponse> {
  return apiJson<BouldersResponse>("/api/boulders");
}

export async function fetchBoulderDetail(
  identity: BoulderPageIdentity
): Promise<{ records: BoulderRecord[]; grade_order: string[] }> {
  const params = new URLSearchParams(identity);
  return apiJson(`/api/boulders/detail?${params.toString()}`);
}

export async function addBoulder(
  request: BoulderCreateRequest,
  dashboard = true
): Promise<BouldersResponse | { ok: true }> {
  return apiJsonBody<BouldersResponse | { ok: true }>(
    dashboard ? "/api/boulders" : "/api/boulders?dashboard=false",
    request,
    { method: "POST" }
  );
}

export async function updateBoulder(request: BoulderUpdateRequest): Promise<BouldersResponse> {
  return apiJsonBody<BouldersResponse>("/api/boulders", request, { method: "PUT" });
}

export async function deleteBoulder(request: BoulderIdentity): Promise<BouldersResponse> {
  return apiJsonBody<BouldersResponse>("/api/boulders", request, { method: "DELETE" });
}

export async function exportBoulders(records: BoulderRecord[]): Promise<Blob> {
  return apiBlob(
    "/api/exports/boulders",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ boulders: records })
    },
    "Export failed"
  );
}
