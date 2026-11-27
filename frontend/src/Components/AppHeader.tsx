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
  isFeedPage: boolean;
  isOnBoulderPage: boolean;
  isOnBouldererPage: boolean;
  onOpenDashboardHome: () => void;
  onOpenProfile: (username: string) => void;
  onAddAscent: (trigger: HTMLButtonElement) => void;
  onOpenTools: (trigger: HTMLButtonElement) => void;
  onSignIn: (trigger: HTMLButtonElement) => void;
  onSelectPage: (page: DashboardPage) => void;
};

export default function AppHeader({
  activePage,
  currentUser,
  isAuthLoading,
  isFeedPage,
  isOnBoulderPage,
  isOnBouldererPage,
  onOpenDashboardHome,
  onOpenProfile,
  onAddAscent,
  onOpenTools,
  onSignIn,
  onSelectPage
}: AppHeaderProps) {
  const isDashboard = !isOnBoulderPage && !isOnBouldererPage;

  return (
    <header className={`${styles.workspaceHeader} ${isFeedPage ? headerStyles.feedHeader : ""}`}>
      <button aria-label={isFeedPage ? "Tick Tracker home" : undefined} className={`${styles.brandButton} ${isFeedPage ? headerStyles.feedBrand : ""}`} type="button" onClick={onOpenDashboardHome}>
        <span className={styles.brandMark} aria-hidden="true">
          TT
        </span>
        <span className={styles.brandText}>
          <strong>Tick Tracker</strong>
          <span>Outdoor boulder log</span>
        </span>
      </button>

      {isDashboard ? (
        <nav className={`${styles.headerNav} ${isFeedPage ? headerStyles.feedNav : ""}`} aria-label="Dashboard pages">
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

      <div className={`${styles.headerAccount} ${isFeedPage ? headerStyles.feedActions : ""}`}>
        {isFeedPage && (
          <button className={headerStyles.toolsButton} type="button" onClick={(event) => onOpenTools(event.currentTarget)}>
            Tools
          </button>
        )}
        {currentUser ? (
          <button
            aria-label={isFeedPage ? `Account: ${currentUser.display_name || currentUser.username}` : undefined}
            className={`${styles.accountChip} ${isFeedPage ? headerStyles.feedAccountChip : ""}`}
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
        ) : isFeedPage ? (
          <button className={headerStyles.signInButton} disabled={isAuthLoading} onClick={(event) => onSignIn(event.currentTarget)} type="button">
            {isAuthLoading ? "Checking..." : "Sign in"}
          </button>
        ) : (
          <span className={styles.signedOutChip}>
            {isAuthLoading ? "Checking account" : "Sign in below"}
          </span>
        )}
        {isDashboard && (
          <button className={headerStyles.addAscentButton} type="button" onClick={(event) => onAddAscent(event.currentTarget)}>
            <span aria-hidden="true">+</span> Add Ascent
          </button>
        )}
      </div>
    </header>
  );
}
