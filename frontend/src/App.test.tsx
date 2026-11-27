// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";

const emptyBoulders = {
  records: [],
  grade_order: [],
  stats: {
    total: 0,
    flash_count: 0,
    flash_rate: 0,
    areas: [],
    grade_counts: { grade_27crags: [], guide_grade: [], own_grade: [] },
    area_counts_by_grade_source: { grade_27crags: [], guide_grade: [], own_grade: [] },
    area_grade_matrix_by_grade_source: { grade_27crags: [], guide_grade: [], own_grade: [] }
  }
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("opening the feed loads feed data without loading logbook data", async () => {
  const paths: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    paths.push(path);
    const body = path === "/api/auth/me" ? { user: null } : path === "/api/boulders" ? { detail: "unused" } : { items: [] };
    return new Response(JSON.stringify(body), {
      status: path === "/api/boulders" ? 500 : 200,
      headers: { "Content-Type": "application/json" }
    });
  }));

  render(<App />);
  await waitFor(() => expect(paths).toContain("/api/feed"));
  expect(paths).not.toContain("/api/boulders");

  fireEvent.click(screen.getByRole("button", { name: "Logbook" }));
  await waitFor(() => expect(paths).toContain("/api/boulders"));
});

test("opening Add Ascent loads suggestions without loading the logbook", async () => {
  const paths: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    paths.push(path);
    const body = path === "/api/auth/me" ? { user: { id: 1, username: "climber", display_name: "Climber", profile_picture_url: null, is_admin: false } } : path === "/api/feed" ? { items: [] } : { areas: [], grades: [], sectors: [] };
    return new Response(JSON.stringify(body), { status: path === "/api/boulders" ? 500 : 200, headers: { "Content-Type": "application/json" } });
  }));
  render(<App />);
  await waitFor(() => expect(paths).toContain("/api/feed"));
  fireEvent.click(screen.getAllByRole("button", { name: "Add Ascent" })[0]);
  const dialog = await screen.findByRole("dialog", { name: "Add Ascent" });
  fireEvent.focus(within(dialog).getByRole("textbox", { name: "Name" }));
  await waitFor(() => expect(paths).toContain("/api/boulders/suggestions"));
  expect(paths).not.toContain("/api/boulders");
});

test("reopening a page reuses its loaded data", async () => {
  const paths: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    paths.push(path);
    const body = path === "/api/auth/me" ? { user: null } : path === "/api/feed" ? { items: [] } : emptyBoulders;
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  }));
  render(<App />);
  await waitFor(() => expect(paths).toContain("/api/feed"));
  fireEvent.click(screen.getByRole("button", { name: "Logbook" }));
  await waitFor(() => expect(paths).toContain("/api/boulders"));
  fireEvent.click(screen.getByRole("button", { name: "Feed" }));
  fireEvent.click(screen.getByRole("button", { name: "Logbook" }));
  expect(paths.filter((path) => path === "/api/feed")).toHaveLength(1);
  expect(paths.filter((path) => path === "/api/boulders")).toHaveLength(1);
});

test("saving an ascent refreshes the visible feed", async () => {
  const paths: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    paths.push(path);
    const body = path === "/api/auth/me"
      ? { user: { id: 1, username: "climber", display_name: "Climber", profile_picture_url: null, is_admin: false } }
      : path === "/api/feed" ? { items: [] }
      : path === "/api/boulders/suggestions" ? { areas: [], grades: [], sectors: [] }
      : path === "/api/boulders?dashboard=false" ? { ok: true }
      : emptyBoulders;
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  }));
  render(<App />);
  await waitFor(() => expect(paths.filter((path) => path === "/api/feed")).toHaveLength(1));
  fireEvent.click(screen.getAllByRole("button", { name: "Add Ascent" })[0]);
  const dialog = await screen.findByRole("dialog", { name: "Add Ascent" });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), { target: { value: "New Problem" } });
  fireEvent.change(within(dialog).getByLabelText("Area"), { target: { value: "New Area" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save Ascent" }));
  await waitFor(() => expect(paths.filter((path) => path === "/api/feed")).toHaveLength(2));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add Ascent" })).toBeNull());
  expect(screen.getByRole("status").textContent).toBe("Ascent added");
  expect(paths).toContain("/api/boulders?dashboard=false");
  expect(paths).not.toContain("/api/boulders");
});

test("closing Add Ascent keeps the draft when it is reopened", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    const body = path === "/api/auth/me"
      ? { user: { id: 1, username: "climber", display_name: "Climber", profile_picture_url: null, is_admin: false } }
      : path === "/api/feed" ? { items: [] } : { areas: [], grades: [], sectors: [] };
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  }));
  render(<App />);
  await screen.findByRole("heading", { name: "Latest activity" });
  const trigger = screen.getAllByRole("button", { name: "Add Ascent" })[0];
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Add Ascent" });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), { target: { value: "Project" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Close Add Ascent" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add Ascent" })).toBeNull());
  fireEvent.click(trigger);
  const reopened = await screen.findByRole("dialog", { name: "Add Ascent" });
  expect(within(reopened).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value).toBe("Project");
  fireEvent(reopened, new Event("cancel", { cancelable: true }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add Ascent" })).toBeNull());
  expect(document.activeElement).toBe(trigger);
});

test("a failed save keeps Add Ascent open with its draft and an error", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    const body = path === "/api/auth/me"
      ? { user: { id: 1, username: "climber", display_name: "Climber", profile_picture_url: null, is_admin: false } }
      : path === "/api/feed" ? { items: [] }
      : path === "/api/boulders?dashboard=false" ? { detail: "Save failed" }
      : { areas: [], grades: [], sectors: [] };
    return new Response(JSON.stringify(body), {
      status: path === "/api/boulders?dashboard=false" ? 500 : 200,
      headers: { "Content-Type": "application/json" }
    });
  }));
  render(<App />);
  await screen.findByRole("heading", { name: "Latest activity" });
  fireEvent.click(screen.getAllByRole("button", { name: "Add Ascent" })[0]);
  const dialog = await screen.findByRole("dialog", { name: "Add Ascent" });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Name" }), { target: { value: "Project" } });
  fireEvent.change(within(dialog).getByLabelText("Area"), { target: { value: "Area" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save Ascent" }));
  await within(dialog).findByRole("alert");
  expect(within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value).toBe("Project");
  expect(screen.getByRole("dialog", { name: "Add Ascent" })).toBe(dialog);
});

test("signed-out Add Ascent sends the user to the sign-in panel", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const body = String(input) === "/api/auth/me" ? { user: null } : { items: [] };
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  }));
  render(<App />);
  await screen.findByRole("heading", { name: "Latest activity" });
  fireEvent.click(screen.getAllByRole("button", { name: "Add Ascent" })[0]);
  const dialog = await screen.findByRole("dialog", { name: "Add Ascent" });
  expect(within(dialog).getByText("Sign in to add an ascent to your logbook.")).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button", { name: "Go to sign in" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add Ascent" })).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(document.querySelector("input[autocomplete='username']")));
});

test("reopening the feed retries a failed read", async () => {
  let feedRequests = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === "/api/feed") feedRequests += 1;
    const body = path === "/api/auth/me" ? { user: null } : path === "/api/feed" ? { items: [] } : emptyBoulders;
    return new Response(JSON.stringify(body), {
      status: path === "/api/feed" && feedRequests === 1 ? 500 : 200,
      headers: { "Content-Type": "application/json" }
    });
  }));
  render(<App />);
  await waitFor(() => expect(feedRequests).toBe(1));
  fireEvent.click(screen.getByRole("button", { name: "Logbook" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Logbook" }).getAttribute("aria-current")).toBe("page"));
  fireEvent.click(screen.getByRole("button", { name: "Feed" }));
  await waitFor(() => expect(feedRequests).toBe(2));
});

test("opening a boulder from the feed reads only that boulder's detail", async () => {
  const paths: string[] = [];
  const record = {
    name: "Problem", area: "Area", sector: "", climber: "climber",
    climber_display_name: "Climber", grade_27crags: "6a", guide_grade: "6a", own_grade: "6a",
    flash: false, climbed_on: null, rating: null, visibility: "public",
    ascent_id: 1, added_at: "2026-01-01 00:00:00"
  };
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    paths.push(path);
    const body = path === "/api/auth/me" ? { user: null }
      : path === "/api/feed" ? { items: [{ kind: "ascent", record, comments: [] }] }
      : path.startsWith("/api/boulders/detail?") ? { records: [record], grade_order: [] }
      : path.startsWith("/api/boulders/media?") ? { media: [] }
      : path.startsWith("/api/boulders/comments?") ? { comments: [] }
      : emptyBoulders;
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  }));
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "Problem" }));
  await waitFor(() => expect(paths.some((path) => path.startsWith("/api/boulders/detail?"))).toBe(true));
  expect(paths).not.toContain("/api/boulders");
});
