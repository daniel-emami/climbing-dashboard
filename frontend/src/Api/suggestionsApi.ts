import { apiJson } from "./apiClient";

export type BoulderSuggestions = { areas: string[]; grades: string[]; sectors: string[] };

export function fetchBoulderSuggestions(): Promise<BoulderSuggestions> {
  return apiJson<BoulderSuggestions>("/api/boulders/suggestions");
}
