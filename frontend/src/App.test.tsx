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
    grade_counts: { grade_thetopo: [], guide_grade: [], own_grade: [] },
    area_counts_by_grade_source: { grade_thetopo: [], guide_grade: [], own_grade: [] },
    area_grade_matrix_by_grade_source: { grade_thetopo: [], guide_grade: [], own_grade: [] }
  }
};

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
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

test("Feed, Logbook, and Map share header dialogs without sidebar cards", async () => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    const body = path === "/api/auth/me" ? { user: null }
      : path === "/api/feed" ? { items: [] }
      : emptyBoulders;
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  }));

  render(<App />);
  await screen.findByRole("heading", { name: "Latest activity" });
  expect(screen.queryByRole("button", { name: "Preview Boulders" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Import TheTopo" }));
  const importDialog = await screen.findByRole("dialog", { name: "Import TheTopo" });
  expect(within(importDialog).getByRole("button", { name: "Preview Boulders" })).toBeTruthy();
  fireEvent.click(within(importDialog).getByRole("button", { name: "Close Import TheTopo" }));
  for (const page of ["Logbook", "Map"]) {
    fireEvent.click(screen.getByRole("button", { name: page }));
    await waitFor(() => expect(screen.getByRole("button", { name: page }).getAttribute("aria-current")).toBe("page"));
    expect(screen.queryByRole("button", { name: "Preview Boulders" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Username" })).toBeNull();
    expect(screen.queryByText("Sign in below")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Import TheTopo" }));
    const drawer = await screen.findByRole("dialog", { name: "Import TheTopo" });
    expect(within(drawer).getByRole("button", { name: "Preview Boulders" })).toBeTruthy();
    fireEvent.click(within(drawer).getByRole("button", { name: "Close Import TheTopo" }));
    const loginTrigger = screen.getByRole("button", { name: "Login" });
    fireEvent.click(loginTrigger);
    const login = await screen.findByRole("dialog", { name: "Login" });
    expect(within(login).getByLabelText("Username")).toBe(document.activeElement);
    fireEvent.click(within(login).getByRole("button", { name: "Close Login" }));
    expect(document.activeElement).toBe(loginTrigger);
  }
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

test("signed-out Add Ascent opens the sign-in dialog", async () => {
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
  expect(await screen.findByRole("dialog", { name: "Login" })).toBeTruthy();
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
    climber_display_name: "Climber", grade_thetopo: "6a", guide_grade: "6a", own_grade: "6a",
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
  fireEvent.click(await screen.findByRole("link", { name: "Problem" }));
  await waitFor(() => expect(paths.some((path) => path.startsWith("/api/boulders/detail?"))).toBe(true));
  expect(paths).not.toContain("/api/boulders");
});

test.each([
  ["6c", "6b+", "6c"],
  ["", "6b+", "6b+"],
  ["  ", "6b+", "6b+"],
  ["", "", null]
])("both feed card types prefer own grade %j over TheTopo %j", async (ownGrade, theTopoGrade, expected) => {
  const record = {
    name: "Ascent problem", area: "Area", sector: "", climber: "climber",
    climber_display_name: "Climber", grade_thetopo: theTopoGrade, guide_grade: "7a", own_grade: ownGrade,
    flash: false, climbed_on: null, rating: null, visibility: "public",
    ascent_id: 1, added_at: "2026-01-01 00:00:00"
  };
  const media = {
    id: 1, boulder_name: "Video problem", area: "Area", sector: "", ascent_id: 1,
    user_id: 1, climber: "climber", climber_display_name: "Climber", visibility: "public",
    media_type: "video", url: "/api/boulders/media/1/content", original_filename: "video.mp4",
    mime_type: "video/mp4", file_size: 10, caption: "", created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00", own_grade: ownGrade, grade_thetopo: theTopoGrade
  };
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const body = String(input) === "/api/auth/me" ? { user: null }
      : { items: [{ kind: "ascent", record, comments: [] }, { kind: "video", media }] };
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  }));
  render(<App />);
  await screen.findByRole("link", { name: "Video problem" });
  expect(screen.getByRole("link", { name: "Ascent problem" })).toBeTruthy();
  if (expected) expect(screen.getAllByText(expected, { exact: true })).toHaveLength(2);
  else expect(screen.queryByText("Ungraded")).toBeNull();
  expect(screen.queryByText("7a")).toBeNull();
  if (expected !== theTopoGrade && theTopoGrade) expect(screen.queryByText(theTopoGrade, { exact: true })).toBeNull();
});

test.each([true, false])("password reset is available only to admins (admin=%s)", async (isAdmin) => {
  const requests: Array<{ path: string; body: unknown }> = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    requests.push({ path, body: init?.body ? JSON.parse(String(init.body)) : null });
    const body = path === "/api/auth/me"
      ? { user: { id: 1, username: "climber", display_name: "Climber", profile_picture_url: null, is_admin: isAdmin } }
      : path === "/api/auth/admin/reset-password" ? { username: "friend", temporary_password: "temporary123" }
      : { items: [] };
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  }));
  render(<App />);
  await screen.findByRole("button", { name: "Sign out" });
  expect(screen.queryByRole("button", { name: "View Profile" })).toBeNull();
  if (!isAdmin) {
    expect(screen.queryByRole("button", { name: "Reset password" })).toBeNull();
    return;
  }
  const trigger = screen.getByRole("button", { name: "Reset password" });
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Reset password" });
  fireEvent.change(within(dialog).getByPlaceholderText("Username"), { target: { value: "friend" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Generate" }));
  await waitFor(() => expect(within(dialog).getByLabelText<HTMLInputElement>("Generated password").value).toBe("temporary123"));
  expect(requests).toContainEqual({ path: "/api/auth/admin/reset-password", body: { username: "friend" } });
  expect(within(dialog).queryByRole("button", { name: "Sign out" })).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close Reset password" }));
  expect(document.activeElement).toBe(trigger);
});
