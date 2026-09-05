import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addBoulder,
  deleteBoulder,
  exportBoulders,
  fetchBoulders,
  updateBoulder
} from "./Api/boulderApi";
import {
  fetchCurrentUser,
  login as loginUser,
  logout as logoutUser,
  signup as signupUser
} from "./Api/authApi";
import {
  addBoulderComment,
  deleteBoulderComment,
  fetchBoulderComments,
  updateBoulderComment
} from "./Api/commentApi";
import {
  deleteBoulderMedia,
  fetchBoulderMedia,
  uploadBoulderVideo
} from "./Api/mediaApi";
import ActivityFeed from "./Components/ActivityFeed";
import AreaChart from "./Components/AreaChart";
import AreaGradeMatrix from "./Components/AreaGradeMatrix";
import AuthPanel from "./Components/AuthPanel";
import BoulderDetailPage from "./Components/BoulderDetailPage";
import BoulderForm from "./Components/BoulderForm";
import BoulderTable from "./Components/BoulderTable";
import ErrorState from "./Components/ErrorState";
import GradeChart, { type GradeChartSeries } from "./Components/GradeChart";
import LoadingState from "./Components/LoadingState";
import SummaryStrip from "./Components/SummaryStrip";
import TheTopoImportPanel from "./Components/TheTopoImportPanel";
import {
  GRADE_SOURCE_COLORS,
  GRADE_SOURCE_FIELDS,
  GRADE_SOURCE_LABELS,
  type GradeChartMode
} from "./Config/gradeSources";
import type { AuthUser, LoginRequest, SignupRequest } from "./Types/authTypes";
import type {
  AreaCount,
  BoulderComment,
  BoulderCommentUpdateRequest,
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderMedia,
  BoulderMediaUploadRequest,
  BoulderPageIdentity,
  BoulderRecord,
  BouldersResponse,
  DashboardStats,
  GradeField
} from "./Types/boulderTypes";

const DASHBOARD_GRADE_SOURCE_FIELDS: GradeField[] = [
  "grade_27crags",
  "own_grade",
  "guide_grade"
];

type DashboardPage = "feed" | "logbook" | "map";

const DASHBOARD_PAGES: Array<{ key: DashboardPage; label: string }> = [
  { key: "feed", label: "Feed" },
  { key: "logbook", label: "Logbook" },
  { key: "map", label: "Map" }
];

function formatRefreshTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function boulderIdentityFromHash(): BoulderPageIdentity | null {
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

function writeBoulderHash(identity: BoulderPageIdentity | null) {
  if (!identity) {
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
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

function isSameBoulder(record: BoulderRecord, identity: BoulderPageIdentity): boolean {
  return (
    record.name.trim().toLocaleLowerCase() === identity.name.trim().toLocaleLowerCase() &&
    record.area.trim().toLocaleLowerCase() === identity.area.trim().toLocaleLowerCase() &&
    record.sector.trim().toLocaleLowerCase() === identity.sector.trim().toLocaleLowerCase()
  );
}

function orderedGradeCounts(records: BoulderRecord[], field: GradeField, gradeOrder: string[]) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const grade = record[field];
    if (grade) {
      counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }
  }
  const known = gradeOrder
    .filter((grade) => counts.has(grade))
    .map((grade) => ({ grade, count: counts.get(grade) ?? 0 }));
  const unknown = Array.from(counts.entries())
    .filter(([grade]) => !gradeOrder.includes(grade))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([grade, count]) => ({ grade, count }));
  return known.concat(unknown);
}

function areaCounts(records: BoulderRecord[], gradeField?: GradeField): AreaCount[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (!record.area || (gradeField && !record[gradeField])) {
      continue;
    }
    counts.set(record.area, (counts.get(record.area) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((left, right) => right.count - left.count);
}

function areaGradeMatrix(
  records: BoulderRecord[],
  gradeField: GradeField
): Array<Record<string, number | string>> {
  const matrix = new Map<string, Map<string, number>>();
  for (const record of records) {
    const grade = record[gradeField];
    if (!record.area || !grade) {
      continue;
    }
    const gradeCounts = matrix.get(record.area) ?? new Map<string, number>();
    gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1);
    matrix.set(record.area, gradeCounts);
  }
  return Array.from(matrix.entries())
    .map(([area, gradeCounts]) => {
      const row: Record<string, number | string> = { area };
      let total = 0;
      for (const [grade, count] of gradeCounts.entries()) {
        row[grade] = count;
        total += count;
      }
      row.total = total;
      return row;
    })
    .sort((left, right) => Number(right.total) - Number(left.total));
}

function buildStats(records: BoulderRecord[], gradeOrder: string[]): DashboardStats {
  const flashCount = records.filter((record) => record.flash).length;
  return {
    total: records.length,
    flash_count: flashCount,
    flash_rate: records.length === 0 ? 0 : flashCount / records.length,
    areas: areaCounts(records),
    grade_counts: {
      grade_27crags: orderedGradeCounts(records, "grade_27crags", gradeOrder),
      guide_grade: orderedGradeCounts(records, "guide_grade", gradeOrder),
      own_grade: orderedGradeCounts(records, "own_grade", gradeOrder)
    },
    area_counts_by_grade_source: {
      grade_27crags: areaCounts(records, "grade_27crags"),
      guide_grade: areaCounts(records, "guide_grade"),
      own_grade: areaCounts(records, "own_grade")
    },
    area_grade_matrix_by_grade_source: {
      grade_27crags: areaGradeMatrix(records, "grade_27crags"),
      guide_grade: areaGradeMatrix(records, "guide_grade"),
      own_grade: areaGradeMatrix(records, "own_grade")
    }
  };
}

function recordMatchesSearch(record: BoulderRecord, searchQuery: string): boolean {
  const query = searchQuery.trim().toLocaleLowerCase();
  if (!query) {
    return true;
  }
  return [
    record.name,
    record.area,
    record.sector,
    record.climber,
    record.climber_display_name,
    record.grade_27crags,
    record.guide_grade,
    record.own_grade,
    record.climbed_on ?? "",
    record.flash ? "flash" : "",
    record.visibility,
    record.rating === null ? "" : `${record.rating}/5`
  ]
    .join(" ")
    .toLocaleLowerCase()
    .includes(query);
}

export default function App() {
  const [data, setData] = useState<BouldersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeAreaMapGradeField, setActiveAreaMapGradeField] = useState<GradeField>("own_grade");
  const [gradeChartMode, setGradeChartMode] = useState<GradeChartMode>("own_grade");
  const [activePage, setActivePage] = useState<DashboardPage>("feed");
  const [selectedClimber, setSelectedClimber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBoulder, setSelectedBoulder] = useState<BoulderPageIdentity | null>(
    boulderIdentityFromHash
  );
  const [selectedBoulderComments, setSelectedBoulderComments] = useState<BoulderComment[]>([]);
  const [selectedBoulderMedia, setSelectedBoulderMedia] = useState<BoulderMedia[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthSaving, setIsAuthSaving] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isMediaSaving, setIsMediaSaving] = useState(false);

  const loadStoredData = useCallback(async () => {
    try {
      const payload = await fetchBoulders();
      setData(payload);
      setError(null);
      setLastUpdated(formatRefreshTime());
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown error");
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStoredData();
  }, [loadStoredData]);

  const loadCurrentAuthUser = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      const payload = await fetchCurrentUser();
      setCurrentUser(payload.user);
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown auth error");
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCurrentAuthUser();
  }, [loadCurrentAuthUser]);

  useEffect(() => {
    const syncRouteFromHash = () => setSelectedBoulder(boulderIdentityFromHash());
    window.addEventListener("hashchange", syncRouteFromHash);
    window.addEventListener("popstate", syncRouteFromHash);
    return () => {
      window.removeEventListener("hashchange", syncRouteFromHash);
      window.removeEventListener("popstate", syncRouteFromHash);
    };
  }, []);

  useEffect(() => {
    if (!selectedBoulder) {
      setSelectedBoulderComments([]);
      return;
    }

    let ignoreResult = false;
    setSelectedBoulderComments([]);
    setIsCommentsLoading(true);
    fetchBoulderComments(selectedBoulder)
      .then((payload) => {
        if (!ignoreResult) {
          setSelectedBoulderComments(payload.comments);
          setError(null);
        }
      })
      .catch((unknownError: unknown) => {
        if (!ignoreResult) {
          setError(
            unknownError instanceof Error ? unknownError.message : "Unknown comment error"
          );
        }
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsCommentsLoading(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [selectedBoulder]);

  useEffect(() => {
    if (!selectedBoulder) {
      setSelectedBoulderMedia([]);
      return;
    }

    let ignoreResult = false;
    setSelectedBoulderMedia([]);
    setIsMediaLoading(true);
    fetchBoulderMedia(selectedBoulder)
      .then((payload) => {
        if (!ignoreResult) {
          setSelectedBoulderMedia(payload.media);
          setError(null);
        }
      })
      .catch((unknownError: unknown) => {
        if (!ignoreResult) {
          setError(unknownError instanceof Error ? unknownError.message : "Unknown media error");
        }
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsMediaLoading(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [selectedBoulder]);

  const knownAreas = useMemo(
    () => data?.stats.areas.map((area) => area.area).sort((a, b) => a.localeCompare(b)) ?? [],
    [data]
  );

  const knownClimbers = useMemo(
    () =>
      Array.from(new Set(data?.records.map((record) => record.climber).filter(Boolean) ?? []))
        .sort((left, right) => left.localeCompare(right)),
    [data]
  );

  const climberDisplayNames = useMemo(
    () =>
      new Map(
        data?.records.map((record) => [record.climber, record.climber_display_name] as const) ?? []
      ),
    [data]
  );

  const knownSectors = useMemo(
    () =>
      Array.from(new Set(data?.records.map((record) => record.sector).filter(Boolean) ?? []))
        .sort((left, right) => left.localeCompare(right)),
    [data]
  );

  useEffect(() => {
    if (selectedClimber && !knownClimbers.includes(selectedClimber)) {
      setSelectedClimber("");
    }
  }, [knownClimbers, selectedClimber]);

  const knownGrades = useMemo(
    () =>
      data?.grade_order.filter((grade) =>
        data.stats.grade_counts.own_grade.some((entry) => entry.grade === grade)
      ) ?? [],
    [data]
  );

  const visibleData = useMemo<BouldersResponse | null>(() => {
    if (!data) {
      return null;
    }
    const records = data.records.filter(
      (record) =>
        (!selectedClimber || record.climber === selectedClimber) &&
        recordMatchesSearch(record, searchQuery)
    );
    return {
      ...data,
      records,
      stats: buildStats(records, data.grade_order)
    };
  }, [data, searchQuery, selectedClimber]);

  const selectedBoulderRecords = useMemo(() => {
    if (!data || !selectedBoulder) {
      return [];
    }
    return data.records.filter((record) => isSameBoulder(record, selectedBoulder));
  }, [data, selectedBoulder]);

  const activeAreaMapGradeLabel = GRADE_SOURCE_LABELS[activeAreaMapGradeField];
  const gradeChartSeries = useMemo<GradeChartSeries[]>(() => {
    if (!visibleData) {
      return [];
    }
    const fields = gradeChartMode === "all" ? GRADE_SOURCE_FIELDS : [gradeChartMode];
    return fields.map((field) => ({
      key: field,
      label: GRADE_SOURCE_LABELS[field],
      color: GRADE_SOURCE_COLORS[field],
      data: visibleData.stats.grade_counts[field]
    }));
  }, [gradeChartMode, visibleData]);
  const gradeChartTitle =
    gradeChartMode === "all"
      ? "Boulders by all grade sources"
      : `Boulders by ${GRADE_SOURCE_LABELS[gradeChartMode].toLowerCase()}`;

  const handleAddBoulder = async (request: BoulderCreateRequest) => {
    if (!currentUser) {
      setError("You must be logged in to save boulders.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = await addBoulder({ ...request, climber: currentUser.username });
      setData(payload);
      setError(null);
      setLastUpdated(formatRefreshTime());
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown error");
      throw unknownError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBoulder = async (
    original: BoulderIdentity,
    boulder: BoulderCreateRequest
  ) => {
    if (!currentUser) {
      setError("You must be logged in to edit boulders.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = await updateBoulder({
        original,
        boulder: { ...boulder, climber: currentUser.username }
      });
      setData(payload);
      setError(null);
      setLastUpdated(formatRefreshTime());
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown error");
      throw unknownError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBoulder = async (request: BoulderIdentity) => {
    if (!currentUser) {
      setError("You must be logged in to delete boulders.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = await deleteBoulder(request);
      setData(payload);
      setError(null);
      setLastUpdated(formatRefreshTime());
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown error");
      throw unknownError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogin = async (request: LoginRequest) => {
    setIsAuthSaving(true);
    try {
      const payload = await loginUser(request);
      setCurrentUser(payload.user);
      setError(null);
      await loadStoredData();
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown auth error");
      throw unknownError;
    } finally {
      setIsAuthSaving(false);
    }
  };

  const handleSignup = async (request: SignupRequest) => {
    setIsAuthSaving(true);
    try {
      const payload = await signupUser(request);
      setCurrentUser(payload.user);
      setError(null);
      await loadStoredData();
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown auth error");
      throw unknownError;
    } finally {
      setIsAuthSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthSaving(true);
    try {
      await logoutUser();
      setCurrentUser(null);
      setSelectedClimber("");
      setError(null);
      await loadStoredData();
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown auth error");
      throw unknownError;
    } finally {
      setIsAuthSaving(false);
    }
  };

  const handleImportedBoulders = (payload: BouldersResponse) => {
    setData(payload);
    setError(null);
    setLastUpdated(formatRefreshTime());
  };

  const handleOpenBoulder = (identity: BoulderPageIdentity) => {
    setSelectedBoulder(identity);
    writeBoulderHash(identity);
  };

  const handleCloseBoulder = () => {
    setSelectedBoulder(null);
    writeBoulderHash(null);
  };

  const handleAddBoulderComment = async (body: string) => {
    if (!selectedBoulder) {
      return;
    }
    if (!currentUser) {
      setError("You must be logged in to comment.");
      return;
    }
    setIsCommentSaving(true);
    try {
      const payload = await addBoulderComment({
        name: selectedBoulder.name,
        area: selectedBoulder.area,
        sector: selectedBoulder.sector,
        body
      });
      setSelectedBoulderComments(payload.comments);
      setError(null);
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown comment error");
      throw unknownError;
    } finally {
      setIsCommentSaving(false);
    }
  };

  const handleUpdateBoulderComment = async (
    commentId: number,
    request: BoulderCommentUpdateRequest
  ) => {
    if (!currentUser) {
      setError("You must be logged in to edit comments.");
      return;
    }
    setIsCommentSaving(true);
    try {
      const payload = await updateBoulderComment(commentId, request);
      setSelectedBoulderComments(payload.comments);
      setError(null);
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown comment error");
      throw unknownError;
    } finally {
      setIsCommentSaving(false);
    }
  };

  const handleDeleteBoulderComment = async (commentId: number) => {
    if (!currentUser) {
      setError("You must be logged in to delete comments.");
      return;
    }
    setIsCommentSaving(true);
    try {
      const payload = await deleteBoulderComment(commentId);
      setSelectedBoulderComments(payload.comments);
      setError(null);
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown comment error");
      throw unknownError;
    } finally {
      setIsCommentSaving(false);
    }
  };

  const handleUploadBoulderVideo = async (
    request: Omit<BoulderMediaUploadRequest, "name" | "area" | "sector">
  ) => {
    if (!selectedBoulder) {
      return;
    }
    setIsMediaSaving(true);
    try {
      const payload = await uploadBoulderVideo({
        ...request,
        name: selectedBoulder.name,
        area: selectedBoulder.area,
        sector: selectedBoulder.sector
      });
      setSelectedBoulderMedia(payload.media);
      setError(null);
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown media error");
      throw unknownError;
    } finally {
      setIsMediaSaving(false);
    }
  };

  const handleDeleteBoulderMedia = async (mediaId: number) => {
    setIsMediaSaving(true);
    try {
      const payload = await deleteBoulderMedia(mediaId);
      setSelectedBoulderMedia(payload.media);
      setError(null);
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown media error");
      throw unknownError;
    } finally {
      setIsMediaSaving(false);
    }
  };

  const handleExportVisibleBoulders = async () => {
    if (!visibleData) {
      return;
    }
    try {
      const blob = await exportBoulders(visibleData.records);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = selectedClimber
        ? `climbing-dashboard-${selectedClimber}.xlsx`
        : "climbing-dashboard-all-climbers.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setError(null);
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown export error");
    }
  };

  return (
    <main className="app-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Outdoor boulders</p>
          <h1>Climbing Dashboard</h1>
        </div>
        <dl className="workspace-status" aria-label="Loaded data status">
          <div>
            <dt>Storage</dt>
            <dd>SQLite</dd>
          </div>
          <div>
            <dt>Rows</dt>
            <dd>{visibleData?.records.length ?? data?.records.length ?? 0}</dd>
          </div>
          <div>
            <dt>Loaded</dt>
            <dd>{lastUpdated ?? "-"}</dd>
          </div>
        </dl>
      </header>

      {selectedBoulder && data && !isInitialLoading ? (
        <>
          {error && <ErrorState message={error} />}
          <BoulderDetailPage
            identity={selectedBoulder}
            gradeOrder={data.grade_order}
            comments={selectedBoulderComments}
            isSaving={isSaving}
            isCommentsLoading={isCommentsLoading}
            isCommentSaving={isCommentSaving}
            currentUsername={currentUser?.username ?? null}
            isMediaLoading={isMediaLoading}
            isMediaSaving={isMediaSaving}
            media={selectedBoulderMedia}
            records={selectedBoulderRecords}
            onAddComment={handleAddBoulderComment}
            onBack={handleCloseBoulder}
            onDeleteComment={handleDeleteBoulderComment}
            onDeleteMedia={handleDeleteBoulderMedia}
            onUploadVideo={handleUploadBoulderVideo}
            onUpdateComment={handleUpdateBoulderComment}
            onUpdate={handleUpdateBoulder}
          />
        </>
      ) : (
        <div className="dashboard-layout">
          <aside className="control-rail">
            <AuthPanel
              user={currentUser}
              isLoading={isAuthLoading}
              isSaving={isAuthSaving}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onSignup={handleSignup}
            />
            <TheTopoImportPanel
              currentUsername={currentUser?.username ?? null}
              onImported={handleImportedBoulders}
              onError={setError}
            />
            <BoulderForm
              isSaving={isSaving}
              knownAreas={knownAreas}
              knownGrades={knownGrades}
              knownSectors={knownSectors}
              currentDisplayName={currentUser?.display_name ?? null}
              currentUsername={currentUser?.username ?? null}
              onSubmit={handleAddBoulder}
            />
          </aside>

          <section className="dashboard-main" aria-label="Climbing Dashboard">
            {isInitialLoading && <LoadingState />}
            {error && <ErrorState message={error} />}
            {visibleData && !isInitialLoading && (
              <>
                <SummaryStrip data={visibleData} />

                <nav className="dashboard-page-tabs" aria-label="Dashboard pages">
                  {DASHBOARD_PAGES.map((page) => (
                    <button
                      className={activePage === page.key ? "active" : ""}
                      key={page.key}
                      type="button"
                      onClick={() => setActivePage(page.key)}
                    >
                      {page.label}
                    </button>
                  ))}
                </nav>

              <section className="panel dashboard-controls-panel">
                <div className="dashboard-control-group grade-source-control">
                  <span className="section-kicker">Grade Source</span>
                  <div className="segmented-control" role="group" aria-label="Grade source">
                    {DASHBOARD_GRADE_SOURCE_FIELDS.map((field) => (
                      <button
                        className={field === gradeChartMode ? "active" : ""}
                        key={field}
                        type="button"
                        onClick={() => {
                          setActiveAreaMapGradeField(field);
                          setGradeChartMode(field);
                        }}
                      >
                        {GRADE_SOURCE_LABELS[field]}
                      </button>
                    ))}
                    <button
                      className={gradeChartMode === "all" ? "active" : ""}
                      type="button"
                      onClick={() => setGradeChartMode("all")}
                    >
                      Combined
                    </button>
                  </div>
                </div>

                <label className="dashboard-control-group search-control">
                  <span className="section-kicker">Search</span>
                  <select
                    value={selectedClimber}
                    onChange={(event) => setSelectedClimber(event.target.value)}
                  >
                    <option value="">All climbers</option>
                    {knownClimbers.map((climber) => (
                      <option key={climber} value={climber}>
                        {climberDisplayNames.get(climber) ?? climber}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Boulder name"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>

                <div className="dashboard-control-group climber-control">
                  <button
                    disabled={visibleData.records.length === 0}
                    type="button"
                    onClick={() => void handleExportVisibleBoulders()}
                  >
                    Export Selected
                  </button>
                </div>
              </section>

              {activePage === "feed" && (
                <>
                  <ActivityFeed
                    currentUsername={currentUser?.username ?? null}
                    selectedClimber={selectedClimber}
                    records={visibleData.records}
                    onError={setError}
                    onOpenBoulder={handleOpenBoulder}
                  />
                  <div className="insight-grid">
                    <GradeChart
                      title={gradeChartTitle}
                      gradeOrder={visibleData.grade_order}
                      series={gradeChartSeries}
                    />
                    <AreaChart
                      data={visibleData.stats.area_counts_by_grade_source[activeAreaMapGradeField]}
                      gradeSourceLabel={activeAreaMapGradeLabel}
                    />
                  </div>
                </>
              )}

              {activePage === "logbook" && (
                <BoulderTable
                  records={visibleData.records}
                  gradeOrder={visibleData.grade_order}
                  isSaving={isSaving}
                  currentDisplayName={currentUser?.display_name ?? null}
                  currentUsername={currentUser?.username ?? null}
                  onDelete={handleDeleteBoulder}
                  onOpenBoulder={handleOpenBoulder}
                  onUpdate={handleUpdateBoulder}
                />
              )}

              {activePage === "map" && (
                <AreaGradeMatrix
                  rows={visibleData.stats.area_grade_matrix_by_grade_source[activeAreaMapGradeField]}
                  grades={visibleData.grade_order}
                  gradeSourceLabel={activeAreaMapGradeLabel}
                />
              )}
            </>
          )}
        </section>
      </div>
      )}
    </main>
  );
}
