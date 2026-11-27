import { profilePictureUrl } from "../Api/bouldererApi";
import { DASHBOARD_PAGES, type DashboardPage } from "../Routing/hashRoutes";
import type { AuthUser } from "../Types/authTypes";
import { initials } from "../Utilities/displayText";
import styles from "../App.module.css";
import headerStyles from "./AppHeader.module.css";

type AppHeaderProps = {
  activePage: DashboardPage;
  currentUser: AuthUser | null;
  isAuthLoading: boolean;
  isAuthSaving: boolean;
  isOnBoulderPage: boolean;
  isOnBouldererPage: boolean;
  onOpenDashboardHome: () => void;
  onOpenProfile: (username: string) => void;
  onAddAscent: (trigger: HTMLButtonElement) => void;
  onOpenImport: (trigger: HTMLButtonElement) => void;
  onSignIn: (trigger: HTMLButtonElement) => void;
  onResetPassword: (trigger: HTMLButtonElement) => void;
  onLogout: () => Promise<void>;
  onSelectPage: (page: DashboardPage) => void;
};

export default function AppHeader({
  activePage,
  currentUser,
  isAuthLoading,
  isAuthSaving,
  isOnBoulderPage,
  isOnBouldererPage,
  onOpenDashboardHome,
  onOpenProfile,
  onAddAscent,
  onOpenImport,
  onSignIn,
  onResetPassword,
  onLogout,
  onSelectPage
}: AppHeaderProps) {
  const isDashboard = !isOnBoulderPage && !isOnBouldererPage;

  return (
    <header className={`${styles.workspaceHeader} ${headerStyles.header}`}>
      <button aria-label="Tick Tracker home" className={`${styles.brandButton} ${headerStyles.brand}`} type="button" onClick={onOpenDashboardHome}>
        <span className={styles.brandMark} aria-hidden="true">
          TT
        </span>
        <span className={styles.brandText}>
          <strong>Tick Tracker</strong>
          <span>Outdoor boulder log</span>
        </span>
      </button>

      {isDashboard ? (
        <nav className={`${styles.headerNav} ${headerStyles.nav}`} aria-label="Dashboard pages">
          {DASHBOARD_PAGES.map((page) => (
            <button
              aria-current={activePage === page.key ? "page" : undefined}
              className={activePage === page.key ? styles.activePage : ""}
              key={page.key}
              type="button"
              onClick={() => onSelectPage(page.key)}
            >
              {page.label}
            </button>
          ))}
        </nav>
      ) : (
        <div className={styles.headerContext}>
          {isOnBouldererPage ? "Boulderer profile" : "Boulder page"}
        </div>
      )}

      <div className={`${styles.headerAccount} ${headerStyles.accountActions} ${headerStyles.actions}`}>
        <button className={headerStyles.importButton} type="button" onClick={(event) => onOpenImport(event.currentTarget)}>
          Import TheTopo
        </button>
        {currentUser?.is_admin && (
          <button className={headerStyles.signInButton} disabled={isAuthSaving} type="button" onClick={(event) => onResetPassword(event.currentTarget)}>
            Reset password
          </button>
        )}
        {currentUser ? (
          <button className={headerStyles.signInButton} disabled={isAuthSaving} type="button" onClick={() => { void onLogout().catch(() => {}); }}>
            {isAuthSaving ? "Signing out..." : "Sign out"}
          </button>
        ) : (
          <button className={headerStyles.signInButton} disabled={isAuthLoading} onClick={(event) => onSignIn(event.currentTarget)} type="button">
            {isAuthLoading ? "Checking..." : "Login"}
          </button>
        )}
        {isDashboard && (
          <button className={headerStyles.addAscentButton} type="button" onClick={(event) => onAddAscent(event.currentTarget)}>
            <span aria-hidden="true">+</span> Add Ascent
          </button>
        )}
        {currentUser && (
          <button
            aria-label={`View Profile: ${currentUser.display_name || currentUser.username}`}
            className={`${styles.accountChip} ${headerStyles.profileButton}`}
            type="button"
            onClick={() => onOpenProfile(currentUser.username)}
          >
            <span className={styles.accountAvatar} aria-hidden="true">
              {currentUser.profile_picture_url ? (
                <img alt="" src={profilePictureUrl(currentUser.profile_picture_url)} />
              ) : (
                initials(currentUser.display_name || currentUser.username) || "@"
              )}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
