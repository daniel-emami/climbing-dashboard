import type { BoulderPageIdentity } from "../Types/boulderTypes";

export type DashboardPage = "feed" | "logbook" | "map";

export const DASHBOARD_PAGES: Array<{ key: DashboardPage; label: string }> = [
  { key: "feed", label: "Feed" },
  { key: "logbook", label: "Logbook" },
  { key: "map", label: "Map" }
];

export function boulderIdentityFromHash(): BoulderPageIdentity | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (params.get("view") !== "boulder") {
    return null;
  }
  const name = params.get("name")?.trim();
  const area = params.get("area")?.trim();
  const sector = params.get("sector")?.trim() ?? "";
  if (!name || !area) {
    return null;
  }
  return { name, area, sector };
}

export function bouldererUsernameFromHash(): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (params.get("view") !== "boulderer") {
    return null;
  }
  return params.get("username")?.trim() || null;
}

export function writeBoulderHash(identity: BoulderPageIdentity | null) {
  if (!identity) {
    clearHashRoute();
    return;
  }
  const params = new URLSearchParams({
    view: "boulder",
    name: identity.name,
    area: identity.area,
    sector: identity.sector
  });
  window.history.pushState(null, "", `#${params.toString()}`);
}

export function writeBouldererHash(username: string | null) {
  if (!username) {
    clearHashRoute();
    return;
  }
  const params = new URLSearchParams({ view: "boulderer", username });
  window.history.pushState(null, "", `#${params.toString()}`);
}

export function clearHashRoute() {
  window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
}
