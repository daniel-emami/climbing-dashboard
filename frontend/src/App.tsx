import { useEffect, useRef, useState } from "react";
import { exportBoulders, fetchBoulderDetail } from "./Api/boulderApi";
import { fetchBoulderSuggestions, type BoulderSuggestions } from "./Api/suggestionsApi";
import AppHeader from "./Components/AppHeader";
import DashboardControlRail from "./Components/DashboardControlRail";
import DashboardPageContent from "./Components/DashboardPageContent";
import DashboardToolbar from "./Components/DashboardToolbar";
import ErrorState from "./Components/ErrorState";
import LoadingState from "./Components/LoadingState";
import BoulderDetailPage from "./Features/BoulderDetail";
import BouldererProfilePage from "./Features/BouldererProfile";
import type {
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderPageIdentity,
  BoulderRecord,
  GradeField
} from "./Types/boulderTypes";
import { type DashboardPage } from "./Routing/hashRoutes";
import { useAuthSession } from "./Hooks/useAuthSession";
import { useBouldererProfile } from "./Hooks/useBouldererProfile";
import { useBoulders } from "./Hooks/useBoulders";
import { useDashboardDerivedData } from "./Hooks/useDashboardDerivedData";
import { useFeed } from "./Hooks/useFeed";
import { useHashRoute } from "./Hooks/useHashRoute";
import { useSelectedBoulderContent } from "./Hooks/useSelectedBoulderContent";
import styles from "./App.module.css";

const DASHBOARD_GRADE_SOURCE_FIELDS: GradeField[] = [
  "grade_27crags",
  "own_grade",
  "guide_grade"
];

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const [activeAreaMapGradeField, setActiveAreaMapGradeField] = useState<GradeField>("own_grade");
  const [activePage, setActivePage] = useState<DashboardPage>("feed");
  const [selectedClimber, setSelectedClimber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<BoulderSuggestions | null>(null);
  const [suggestionsViewer, setSuggestionsViewer] = useState<string | null>(null);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [detailData, setDetailData] = useState<{ records: BoulderRecord[]; grade_order: string[] } | null>(null);
  const [loadedDetailKey, setLoadedDetailKey] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const suggestionsViewerRef = useRef("anonymous");
  const {
    closeBoulder: handleCloseBoulder,
    closeBoulderer: handleCloseBoulderer,
    openBoulder: handleOpenBoulder,
    openBoulderer: handleOpenBoulderer,
    openDashboardHome,
    selectedBoulder,
    selectedBouldererUsername
  } = useHashRoute();
  const {
    data,
    handleAddBoulder: saveBoulder,
    handleDeleteBoulder: deleteSavedBoulder,
    handleImportedBoulders,
    handleUpdateBoulder: updateSavedBoulder,
    hasLoaded,
    isInitialLoading,
    isSaving,
    loadStoredData,
    resetData
  } = useBoulders({ onError: setError });

  const {
    currentUser,
    handleLogin,
    handleLogout,
    handleResetPassword,
    handleSignup,
    isAuthLoading,
    isAuthSaving,
    setCurrentUser
  } = useAuthSession({
    onDataRefresh: async () => {
      resetData();
      setSuggestions(null);
      setLoadedDetailKey(null);
      suggestionsViewerRef.current = "pending";
    },
    onError: setError,
    onLogoutComplete: () => setSelectedClimber("")
  });

  const {
    feedData,
    isFeedLoading,
    invalidateFeed
  } = useFeed({
    active: activePage === "feed" && !selectedBoulder && !selectedBouldererUsername && !isAuthLoading,
    viewerKey: isAuthLoading ? "pending" : String(currentUser?.id ?? "anonymous"),
    onError: setError
  });

  useEffect(() => {
    if (!isAuthLoading && !selectedBouldererUsername && !selectedBoulder && activePage !== "feed" && !hasLoaded && !isInitialLoading) {
      void loadStoredData();
    }
  }, [activePage, hasLoaded, isAuthLoading, isInitialLoading, loadStoredData, selectedBoulder, selectedBouldererUsername]);

  const detailKey = selectedBoulder
    ? `${currentUser?.id ?? "anonymous"}:${selectedBoulder.name}:${selectedBoulder.area}:${selectedBoulder.sector}`
    : null;
  useEffect(() => {
    if (!selectedBoulder || data || isAuthLoading || loadedDetailKey === detailKey) return;
    let cancelled = false;
    setIsDetailLoading(true);
    fetchBoulderDetail(selectedBoulder)
      .then((payload) => {
        if (!cancelled) {
          setDetailData(payload);
          setLoadedDetailKey(detailKey);
          setError(null);
        }
      })
      .catch((unknownError: unknown) => {
        if (!cancelled) setError(unknownError instanceof Error ? unknownError.message : "Unknown boulder error");
      })
      .finally(() => {
        if (!cancelled) setIsDetailLoading(false);
      });
    return () => { cancelled = true; };
  }, [data, detailKey, isAuthLoading, loadedDetailKey, selectedBoulder]);

  const {
    handleSaveBouldererProfile,
    isProfileLoading,
    isProfileSaving,
    selectedBouldererProfile
  } = useBouldererProfile({
    currentUser,
    onDataRefresh: async () => {
      if (hasLoaded) await loadStoredData();
      invalidateFeed();
      setLoadedDetailKey(null);
    },
    onError: setError,
    selectedUsername: selectedBouldererUsername,
    setCurrentUser
  });

  const {
    handleAddBoulderComment,
    handleDeleteBoulderComment,
    handleDeleteBoulderMedia,
    handleUpdateBoulderComment,
    handleUploadBoulderVideo,
    isCommentsLoading,
    isCommentSaving,
    isMediaLoading,
    isMediaSaving,
    selectedBoulderComments,
    selectedBoulderMedia
  } = useSelectedBoulderContent({
    currentUsername: currentUser?.username ?? null,
    onError: setError,
    selectedBoulder
  });

  const {
    activeAreaMapGradeLabel,
    climberDisplayNames,
    gradeChartSeries,
    gradeChartTitle,
    knownAreas,
    knownClimbers,
    knownGrades,
    knownSectors,
    selectedBoulderRecords,
    visibleData
  } = useDashboardDerivedData({
    activeAreaMapGradeField,
    activePage,
    data,
    searchQuery,
    selectedBoulder,
    selectedClimber
  });

  useEffect(() => {
    if (selectedClimber && !knownClimbers.includes(selectedClimber)) {
      setSelectedClimber("");
    }
  }, [knownClimbers, selectedClimber]);

  const handleAddBoulder = async (request: BoulderCreateRequest) => {
    await saveBoulder(request, currentUser?.username ?? null, Boolean(data));
    invalidateFeed();
    setSuggestions(null);
  };

  const handleUpdateBoulder = async (
    original: BoulderIdentity,
    boulder: BoulderCreateRequest
  ) => {
    await updateSavedBoulder(original, boulder, currentUser?.username ?? null);
    invalidateFeed();
    setSuggestions(null);
  };

  const handleDeleteBoulder = async (request: BoulderIdentity) => {
    await deleteSavedBoulder(request, currentUser?.username ?? null);
    invalidateFeed();
    setSuggestions(null);
  };

  const loadSuggestions = async () => {
    const viewer = String(currentUser?.id ?? "anonymous");
    suggestionsViewerRef.current = viewer;
    if (data || isSuggestionsLoading || (suggestions && suggestionsViewer === viewer)) return;
    setIsSuggestionsLoading(true);
    try {
      const payload = await fetchBoulderSuggestions();
      if (suggestionsViewerRef.current === viewer) {
        setSuggestions(payload);
        setSuggestionsViewer(viewer);
      }
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : "Unknown suggestions error");
    } finally {
      setIsSuggestionsLoading(false);
    }
  };
  const visibleSuggestions = suggestionsViewer === String(currentUser?.id ?? "anonymous")
    ? suggestions
    : null;

  const handleOpenDashboardHome = () => {
    setActivePage("feed");
    openDashboardHome();
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
    <main className={styles.shell}>
      <AppHeader
        activePage={activePage}
        currentUser={currentUser}
        isAuthLoading={isAuthLoading}
        isOnBoulderPage={Boolean(selectedBoulder)}
        isOnBouldererPage={Boolean(selectedBouldererUsername)}
        onOpenDashboardHome={handleOpenDashboardHome}
        onOpenProfile={handleOpenBoulderer}
        onSelectPage={setActivePage}
      />

      {selectedBouldererUsername ? (
        <>
          {error && <ErrorState message={error} />}
          {isProfileLoading && <LoadingState />}
          {selectedBouldererProfile && !isProfileLoading && (
            <BouldererProfilePage
              profile={selectedBouldererProfile}
              isSaving={isProfileSaving}
              onBack={handleCloseBoulderer}
              onOpenBoulder={handleOpenBoulder}
              onSave={handleSaveBouldererProfile}
            />
          )}
        </>
      ) : selectedBoulder ? ((data && !isInitialLoading) || (detailData && loadedDetailKey === detailKey) ? (
        <>
          {error && <ErrorState message={error} />}
          <BoulderDetailPage
            identity={selectedBoulder}
            gradeOrder={data?.grade_order ?? detailData?.grade_order ?? []}
            comments={selectedBoulderComments}
            isSaving={isSaving}
            isCommentsLoading={isCommentsLoading}
            isCommentSaving={isCommentSaving}
            currentUserId={currentUser?.id ?? null}
            currentUsername={currentUser?.username ?? null}
            isMediaLoading={isMediaLoading}
            isMediaSaving={isMediaSaving}
            media={selectedBoulderMedia}
            records={data ? selectedBoulderRecords : detailData?.records ?? []}
            onAddComment={handleAddBoulderComment}
            onBack={handleCloseBoulder}
            onDeleteComment={handleDeleteBoulderComment}
            onDeleteMedia={async (mediaId) => {
              await handleDeleteBoulderMedia(mediaId);
              invalidateFeed();
            }}
            onOpenBoulderer={handleOpenBoulderer}
            onUploadVideo={async (request) => {
              await handleUploadBoulderVideo(request);
              invalidateFeed();
            }}
            onUpdateComment={handleUpdateBoulderComment}
            onUpdate={handleUpdateBoulder}
          />
        </>
      ) : (
        <>
          {error && <ErrorState message={error} />}
          {(isInitialLoading || isDetailLoading) && <LoadingState />}
        </>
      )) : (
        <>
          {visibleData && !isInitialLoading && (
            <DashboardToolbar
              activeAreaMapGradeField={activeAreaMapGradeField}
              activePage={activePage}
              climberDisplayNames={climberDisplayNames}
              gradeSourceFields={DASHBOARD_GRADE_SOURCE_FIELDS}
              knownClimbers={knownClimbers}
              onExport={() => void handleExportVisibleBoulders()}
              onSearchChange={setSearchQuery}
              onSelectClimber={setSelectedClimber}
              onSelectGradeField={setActiveAreaMapGradeField}
              recordCount={visibleData.records.length}
              searchQuery={searchQuery}
              selectedClimber={selectedClimber}
            />
          )}

          <div className={styles.dashboardLayout}>
            <DashboardControlRail
              authPanelProps={{
                user: currentUser,
                isLoading: isAuthLoading,
                isSaving: isAuthSaving,
                onLogin: handleLogin,
                onLogout: handleLogout,
                onOpenProfile: handleOpenBoulderer,
                onResetPassword: handleResetPassword,
                onSignup: handleSignup
              }}
              importPanelProps={{
                currentUsername: currentUser?.username ?? null,
                onImported: (payload) => {
                  handleImportedBoulders(payload);
                  invalidateFeed();
                  setSuggestions(null);
                },
                onError: setError
              }}
              boulderFormProps={{
                isSaving,
                knownAreas: data ? knownAreas : visibleSuggestions?.areas ?? [],
                knownGrades: data ? knownGrades : visibleSuggestions?.grades ?? [],
                knownSectors: data ? knownSectors : visibleSuggestions?.sectors ?? [],
                currentDisplayName: currentUser?.display_name ?? null,
                currentUsername: currentUser?.username ?? null,
                onSubmit: handleAddBoulder,
                onSuggestionsNeeded: () => { void loadSuggestions(); }
              }}
            />

            <DashboardPageContent
              activeAreaMapGradeField={activeAreaMapGradeField}
              activeAreaMapGradeLabel={activeAreaMapGradeLabel}
              activePage={activePage}
              currentDisplayName={currentUser?.display_name ?? null}
              currentUsername={currentUser?.username ?? null}
              error={error}
              feedItems={feedData?.items ?? null}
              gradeChartSeries={gradeChartSeries}
              gradeChartTitle={gradeChartTitle}
              isInitialLoading={isInitialLoading}
              isFeedLoading={isFeedLoading}
              isSaving={isSaving}
              onDeleteBoulder={handleDeleteBoulder}
              onError={setError}
              onRefreshFeed={invalidateFeed}
              onOpenBoulder={handleOpenBoulder}
              onOpenBoulderer={handleOpenBoulderer}
              onUpdateBoulder={handleUpdateBoulder}
              visibleData={visibleData}
            />
          </div>
        </>
      )}
    </main>
  );
}
