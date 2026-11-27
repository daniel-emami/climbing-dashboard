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
  isOnBoulderPage: boolean;
  isOnBouldererPage: boolean;
  onOpenDashboardHome: () => void;
  onOpenProfile: (username: string) => void;
  onAddAscent: (trigger: HTMLButtonElement) => void;
  onSelectPage: (page: DashboardPage) => void;
};

export default function AppHeader({
  activePage,
  currentUser,
  isAuthLoading,
  isOnBoulderPage,
  isOnBouldererPage,
  onOpenDashboardHome,
  onOpenProfile,
  onAddAscent,
  onSelectPage
}: AppHeaderProps) {
  const isDashboard = !isOnBoulderPage && !isOnBouldererPage;

  return (
    <header className={styles.workspaceHeader}>
      <button className={styles.brandButton} type="button" onClick={onOpenDashboardHome}>
        <span className={styles.brandMark} aria-hidden="true">
          TT
        </span>
        <span className={styles.brandText}>
          <strong>Tick Tracker</strong>
          <span>Outdoor boulder log</span>
        </span>
      </button>

      {isDashboard ? (
        <nav className={styles.headerNav} aria-label="Dashboard pages">
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

      <div className={styles.headerAccount}>
        {isDashboard && (
          <button className={headerStyles.addAscentButton} type="button" onClick={(event) => onAddAscent(event.currentTarget)}>
            <span aria-hidden="true">+</span> Add Ascent
          </button>
        )}
        {currentUser ? (
          <button
            className={styles.accountChip}
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
            <span className={styles.accountText}>
              <strong>{currentUser.display_name || currentUser.username}</strong>
              <span>@{currentUser.username}</span>
            </span>
          </button>
        ) : (
          <span className={styles.signedOutChip}>
            {isAuthLoading ? "Checking account" : "Sign in below"}
          </span>
        )}
      </div>
    </header>
  );
}
