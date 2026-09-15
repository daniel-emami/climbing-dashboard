import { useEffect, useMemo, useState, type FormEvent } from "react";
import { profilePictureUrl } from "../Api/bouldererApi";
import { mediaUrl } from "../Api/mediaApi";
import { GRADE_SOURCE_LABELS } from "../Config/gradeSources";
import type { BoulderPageIdentity, BoulderRecord, GradeField } from "../Types/boulderTypes";
import type { BouldererProfile } from "../Types/bouldererTypes";
import sharedStyles from "../Styles/Shared.module.css";
import styles from "./BouldererProfilePage.module.css";

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

function location(record: BoulderRecord): string {
  return [record.area, record.sector].filter(Boolean).join(" / ");
}

function ownGrade(record: BoulderRecord): string {
  return record.own_grade || record.grade_27crags || record.guide_grade || "-";
}

function boulderIdentity(record: BoulderRecord): BoulderPageIdentity {
  return { name: record.name, area: record.area, sector: record.sector };
}

function displayDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString([], { day: "2-digit", month: "short", year: "2-digit" });
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
  const [gradeSource, setGradeSource] = useState<GradeField>("own_grade");
  const gradeCounts = profile.stats.grade_counts[gradeSource];
  const largestGradeCount = useMemo(
    () => Math.max(1, ...gradeCounts.map((entry) => entry.count)),
    [gradeCounts]
  );

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
        <section className={`${sharedStyles.panel} ${styles.gridPanel}`}>
          <div className={sharedStyles.panelHeading}>
            <span className={sharedStyles.sectionKicker}>Recent ascents</span>
            <strong>{profile.stats.flash_count} flashes</strong>
          </div>
          {profile.recent_ascents.length === 0 ? (
            <div className={sharedStyles.emptyDetailSlot}>No visible ascents</div>
          ) : (
            <ol className={styles.ascentList}>
              {profile.recent_ascents.map((record) => (
                <li key={record.ascent_id ?? `${record.name}-${record.climbed_on}`}>
                  <button type="button" onClick={() => onOpenBoulder(boulderIdentity(record))}>
                    {record.name}
                  </button>
                  <span>{location(record)}</span>
                  <strong>{ownGrade(record)}</strong>
                  <time>{displayDate(record.climbed_on)}</time>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={`${sharedStyles.panel} ${styles.gridPanel}`}>
          <div className={sharedStyles.panelHeading}>
            <span className={sharedStyles.sectionKicker}>
              {GRADE_SOURCE_LABELS[gradeSource]} grade distribution
            </span>
          </div>
          {gradeCounts.length === 0 ? (
            <div className={sharedStyles.emptyDetailSlot}>No graded ascents</div>
          ) : (
            <ol className={styles.gradeBars}>
              {gradeCounts.map((entry) => (
                <li key={entry.grade}>
                  <span>{entry.grade}</span>
                  <div>
                    <i style={{ width: `${(entry.count / largestGradeCount) * 100}%` }} />
                  </div>
                  <strong>{entry.count}</strong>
                </li>
              ))}
            </ol>
          )}
          <div
            className={`${sharedStyles.segmentedControl} ${styles.gradeSourceControl}`}
            role="group"
            aria-label="Profile grade source"
          >
            {(["grade_27crags", "guide_grade", "own_grade"] as GradeField[]).map((source) => (
              <button
                className={gradeSource === source ? sharedStyles.active : ""}
                key={source}
                type="button"
                onClick={() => setGradeSource(source)}
              >
                {GRADE_SOURCE_LABELS[source]}
              </button>
            ))}
          </div>
        </section>

        <section
          className={`${sharedStyles.panel} ${styles.gridPanel} ${styles.fullWidthPanel}`}
        >
          <div className={sharedStyles.panelHeading}>
            <span className={sharedStyles.sectionKicker}>Ratings</span>
            <strong>{profile.stats.rated_ascents} rated</strong>
          </div>
          {profile.ratings.length === 0 ? (
            <div className={sharedStyles.emptyDetailSlot}>No ratings yet</div>
          ) : (
            <ol className={styles.ratingList}>
              {profile.ratings.map((record) => (
                <li key={record.ascent_id ?? `${record.name}-${record.rating}`}>
                  <button type="button" onClick={() => onOpenBoulder(boulderIdentity(record))}>
                    {record.name}
                  </button>
                  <span>{location(record)}</span>
                  <strong>{record.rating}/5</strong>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section
          className={`${sharedStyles.panel} ${styles.gridPanel} ${styles.fullWidthPanel}`}
        >
          <div className={sharedStyles.panelHeading}>
            <span className={sharedStyles.sectionKicker}>Uploaded videos</span>
            <strong>{profile.media.length}</strong>
          </div>
          {profile.media.length === 0 ? (
            <div className={sharedStyles.emptyDetailSlot}>No visible videos</div>
          ) : (
            <ol className={styles.videoList}>
              {profile.media.map((item) => (
                <li key={item.id}>
                  <video
                    controls
                    crossOrigin="use-credentials"
                    playsInline
                    preload="metadata"
                    src={mediaUrl(item.url)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onOpenBoulder({
                        name: item.boulder_name,
                        area: item.area,
                        sector: item.sector
                      })
                    }
                  >
                    {item.boulder_name}
                  </button>
                  <span>{item.caption || [item.area, item.sector].filter(Boolean).join(" / ")}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </section>
  );
}
