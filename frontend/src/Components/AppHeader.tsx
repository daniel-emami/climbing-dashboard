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
    <header className={`${styles.workspaceHeader} ${headerStyles.header} ${currentUser ? headerStyles.signedIn : ""}`}>
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
        <button aria-label="Import TheTopo" className={headerStyles.importButton} type="button" onClick={(event) => onOpenImport(event.currentTarget)}>
          <span className={headerStyles.fullActionLabel}>Import TheTopo</span>
          <span aria-hidden="true" className={headerStyles.shortActionLabel}>Import</span>
        </button>
        {currentUser?.is_admin && (
          <button aria-label="Reset password" title="Reset password" className={headerStyles.signInButton} disabled={isAuthSaving} type="button" onClick={(event) => onResetPassword(event.currentTarget)}>
            <span className={headerStyles.fullActionLabel}>Reset password</span>
            <svg aria-hidden="true" className={headerStyles.compactIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="5" />
              <path d="m11.5 11.5 9 9M17 17l3-3M20 20l2-2" />
            </svg>
          </button>
        )}
        {currentUser ? (
          <button aria-label={isAuthSaving ? "Signing out..." : "Sign out"} title="Sign out" className={headerStyles.signInButton} disabled={isAuthSaving} type="button" onClick={() => { void onLogout().catch(() => {}); }}>
            <span className={headerStyles.fullActionLabel}>{isAuthSaving ? "Signing out..." : "Sign out"}</span>
            <svg aria-hidden="true" className={headerStyles.compactIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h12" />
            </svg>
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
