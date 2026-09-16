import { useEffect, useState, type FormEvent } from "react";
import { profilePictureUrl } from "../Api/bouldererApi";
import type { BoulderPageIdentity } from "../Types/boulderTypes";
import type { BouldererProfile } from "../Types/bouldererTypes";
import sharedStyles from "../Styles/Shared.module.css";
import BouldererGradeDistributionPanel from "./BouldererGradeDistributionPanel";
import styles from "./BouldererProfilePage.module.css";
import BouldererRatingsPanel from "./BouldererRatingsPanel";
import BouldererRecentAscentsPanel from "./BouldererRecentAscentsPanel";
import BouldererVideosPanel from "./BouldererVideosPanel";

type BouldererProfilePageProps = {
  profile: BouldererProfile;
  isSaving: boolean;
  onBack: () => void;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
  onSave: (displayName: string, profilePicture: File | null) => Promise<void>;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+|_/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function BouldererProfilePage({
  profile,
  isSaving,
  onBack,
  onOpenBoulder,
  onSave
}: BouldererProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.user.display_name);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  useEffect(() => {
    setDisplayName(profile.user.display_name);
    setProfilePicture(null);
  }, [profile.user.display_name, profile.user.profile_picture_url, profile.user.username]);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(displayName, profilePicture);
    setIsEditing(false);
  };

  return (
    <section className={styles.page} aria-label={`${profile.user.display_name} profile`}>
      <button className={sharedStyles.backButton} type="button" onClick={onBack}>
        Back
      </button>

      <section className={`${sharedStyles.panel} ${styles.hero}`}>
        <div className={styles.identity}>
          <div className={styles.avatar}>
            {profile.user.profile_picture_url ? (
              <img
                alt={`${profile.user.display_name} profile`}
                src={profilePictureUrl(profile.user.profile_picture_url)}
              />
            ) : (
              <span aria-hidden="true">{initials(profile.user.display_name)}</span>
            )}
          </div>
          <div>
            <span className={sharedStyles.sectionKicker}>Boulderer</span>
            <h2>{profile.user.display_name}</h2>
            <p>@{profile.user.username}</p>
          </div>
        </div>
        {profile.is_owner && (
          <button
            className={styles.primaryAction}
            type="button"
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        )}
      </section>

      {isEditing && (
        <section className={sharedStyles.panel}>
          <div className={sharedStyles.panelHeading}>
            <span className={sharedStyles.sectionKicker}>Edit profile</span>
          </div>
          <form className={styles.editForm} onSubmit={(event) => void submitProfile(event)}>
            <label>
              Display name
              <input
                required
                maxLength={80}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label>
              Profile picture
              <input
                accept="image/jpeg,image/png,image/webp"
                type="file"
                onChange={(event) => setProfilePicture(event.target.files?.[0] ?? null)}
              />
            </label>
            <button className={styles.primaryAction} disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>
      )}

      <dl className={styles.summary} aria-label="Boulderer highlights">
        <div>
          <dt>Ascents</dt>
          <dd>{profile.stats.total_ascents}</dd>
        </div>
        <div>
          <dt>Favourite area</dt>
          <dd>{profile.stats.favourite_area ?? "-"}</dd>
        </div>
        <div>
          <dt>Highest own grade</dt>
          <dd>{profile.stats.highest_grades.own_grade ?? "-"}</dd>
        </div>
        <div>
          <dt>Average rating</dt>
          <dd>
            {profile.stats.average_rating === null
              ? "-"
              : `${profile.stats.average_rating.toFixed(1)}/5`}
          </dd>
        </div>
      </dl>

      <div className={styles.grid}>
        <BouldererRecentAscentsPanel
          flashCount={profile.stats.flash_count}
          records={profile.recent_ascents}
          onOpenBoulder={onOpenBoulder}
        />

        <BouldererGradeDistributionPanel gradeCountsBySource={profile.stats.grade_counts} />

        <BouldererRatingsPanel
          ratedCount={profile.stats.rated_ascents}
          records={profile.ratings}
          onOpenBoulder={onOpenBoulder}
        />

        <BouldererVideosPanel media={profile.media} onOpenBoulder={onOpenBoulder} />
      </div>
    </section>
  );
}
