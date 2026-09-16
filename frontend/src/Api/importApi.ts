import { apiJsonBody } from "./apiClient";
import type { BouldersResponse } from "../Types/boulderTypes";
import type { ImportConfirmRequest, ImportPreviewResponse } from "../Types/importTypes";

export async function previewTheTopoImport(username: string): Promise<ImportPreviewResponse> {
  return apiJsonBody<ImportPreviewResponse>(
    "/api/imports/thetopo/preview",
    { username },
    { method: "POST" }
  );
}

export async function confirmTheTopoImport(
  request: ImportConfirmRequest
): Promise<BouldersResponse> {
  return apiJsonBody<BouldersResponse>(
    "/api/imports/thetopo/confirm",
    request,
    { method: "POST" }
  );
}
