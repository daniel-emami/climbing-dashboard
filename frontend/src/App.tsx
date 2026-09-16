import { useEffect, useState } from "react";
import { exportBoulders } from "./Api/boulderApi";
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
  GradeField
} from "./Types/boulderTypes";
import { type DashboardPage } from "./Routing/hashRoutes";
import { useAuthSession } from "./Hooks/useAuthSession";
import { useBouldererProfile } from "./Hooks/useBouldererProfile";
import { useBoulders } from "./Hooks/useBoulders";
import { useDashboardDerivedData } from "./Hooks/useDashboardDerivedData";
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
    isInitialLoading,
    isSaving,
    loadStoredData
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
    onDataRefresh: loadStoredData,
    onError: setError,
    onLogoutComplete: () => setSelectedClimber("")
  });

  const {
    handleSaveBouldererProfile,
    isProfileLoading,
    isProfileSaving,
    selectedBouldererProfile
  } = useBouldererProfile({
    currentUser,
    onDataRefresh: loadStoredData,
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

  const handleAddBoulder = (request: BoulderCreateRequest) =>
    saveBoulder(request, currentUser?.username ?? null);

  const handleUpdateBoulder = async (
    original: BoulderIdentity,
    boulder: BoulderCreateRequest
  ) => updateSavedBoulder(original, boulder, currentUser?.username ?? null);

  const handleDeleteBoulder = (request: BoulderIdentity) =>
    deleteSavedBoulder(request, currentUser?.username ?? null);

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
      ) : selectedBoulder && data && !isInitialLoading ? (
        <>
          {error && <ErrorState message={error} />}
          <BoulderDetailPage
            identity={selectedBoulder}
            gradeOrder={data.grade_order}
            comments={selectedBoulderComments}
            isSaving={isSaving}
            isCommentsLoading={isCommentsLoading}
            isCommentSaving={isCommentSaving}
            currentUserId={currentUser?.id ?? null}
            currentUsername={currentUser?.username ?? null}
            isMediaLoading={isMediaLoading}
            isMediaSaving={isMediaSaving}
            media={selectedBoulderMedia}
            records={selectedBoulderRecords}
            onAddComment={handleAddBoulderComment}
            onBack={handleCloseBoulder}
            onDeleteComment={handleDeleteBoulderComment}
            onDeleteMedia={handleDeleteBoulderMedia}
            onOpenBoulderer={handleOpenBoulderer}
            onUploadVideo={handleUploadBoulderVideo}
            onUpdateComment={handleUpdateBoulderComment}
            onUpdate={handleUpdateBoulder}
          />
        </>
      ) : (
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
                onImported: handleImportedBoulders,
                onError: setError
              }}
              boulderFormProps={{
                isSaving,
                knownAreas,
                knownGrades,
                knownSectors,
                currentDisplayName: currentUser?.display_name ?? null,
                currentUsername: currentUser?.username ?? null,
                onSubmit: handleAddBoulder
              }}
            />

            <DashboardPageContent
              activeAreaMapGradeField={activeAreaMapGradeField}
              activeAreaMapGradeLabel={activeAreaMapGradeLabel}
              activePage={activePage}
              currentDisplayName={currentUser?.display_name ?? null}
              currentUsername={currentUser?.username ?? null}
              error={error}
              gradeChartSeries={gradeChartSeries}
              gradeChartTitle={gradeChartTitle}
              isInitialLoading={isInitialLoading}
              isSaving={isSaving}
              onDeleteBoulder={handleDeleteBoulder}
              onError={setError}
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
