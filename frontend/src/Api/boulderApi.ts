import { apiBlob, apiJson, apiJsonBody } from "./apiClient";
import type {
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderRecord,
  BouldersResponse,
  BoulderUpdateRequest
} from "../Types/boulderTypes";

export async function fetchBoulders(): Promise<BouldersResponse> {
  return apiJson<BouldersResponse>("/api/boulders");
}

export async function addBoulder(request: BoulderCreateRequest): Promise<BouldersResponse> {
  return apiJsonBody<BouldersResponse>("/api/boulders", request, { method: "POST" });
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
