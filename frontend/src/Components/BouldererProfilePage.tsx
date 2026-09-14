import { useEffect, useMemo, useState, type FormEvent } from "react";
import { profilePictureUrl } from "../Api/bouldererApi";
import { mediaUrl } from "../Api/mediaApi";
import type { BoulderPageIdentity, BoulderRecord } from "../Types/boulderTypes";
import type { BouldererProfile } from "../Types/bouldererTypes";

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
  const largestGradeCount = useMemo(
    () => Math.max(1, ...profile.stats.grade_counts.map((entry) => entry.count)),
    [profile.stats.grade_counts]
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
    <section className="boulderer-page" aria-label={`${profile.user.display_name} profile`}>
      <button className="back-button" type="button" onClick={onBack}>
        Back
      </button>

      <section className="panel boulderer-hero">
        <div className="boulderer-identity">
          <div className="boulderer-avatar">
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
            <span className="section-kicker">Boulderer</span>
            <h2>{profile.user.display_name}</h2>
            <p>@{profile.user.username}</p>
          </div>
        </div>
        {profile.is_owner && (
          <button type="button" onClick={() => setIsEditing((current) => !current)}>
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        )}
      </section>

      {isEditing && (
        <section className="panel boulderer-edit-panel">
          <div className="panel-heading">
            <span className="section-kicker">Edit profile</span>
          </div>
          <form className="boulderer-edit-form" onSubmit={(event) => void submitProfile(event)}>
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
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>
      )}

      <dl className="boulderer-summary" aria-label="Boulderer highlights">
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

      <div className="boulderer-grid">
        <section className="panel boulderer-recent-panel">
          <div className="panel-heading">
            <span className="section-kicker">Recent ascents</span>
            <strong>{profile.stats.flash_count} flashes</strong>
          </div>
          {profile.recent_ascents.length === 0 ? (
            <div className="empty-detail-slot">No visible ascents</div>
          ) : (
            <ol className="boulderer-ascent-list">
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

        <section className="panel boulderer-grades-panel">
          <div className="panel-heading">
            <span className="section-kicker">Own grade distribution</span>
          </div>
          {profile.stats.grade_counts.length === 0 ? (
            <div className="empty-detail-slot">No graded ascents</div>
          ) : (
            <ol className="boulderer-grade-bars">
              {profile.stats.grade_counts.map((entry) => (
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
          <dl className="boulderer-highest-grades">
            <div><dt>27Crags</dt><dd>{profile.stats.highest_grades.grade_27crags ?? "-"}</dd></div>
            <div><dt>Guide</dt><dd>{profile.stats.highest_grades.guide_grade ?? "-"}</dd></div>
            <div><dt>Own</dt><dd>{profile.stats.highest_grades.own_grade ?? "-"}</dd></div>
          </dl>
        </section>

        <section className="panel boulderer-ratings-panel">
          <div className="panel-heading">
            <span className="section-kicker">Ratings</span>
            <strong>{profile.stats.rated_ascents} rated</strong>
          </div>
          {profile.ratings.length === 0 ? (
            <div className="empty-detail-slot">No ratings yet</div>
          ) : (
            <ol className="boulderer-rating-list">
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

        <section className="panel boulderer-videos-panel">
          <div className="panel-heading">
            <span className="section-kicker">Uploaded videos</span>
            <strong>{profile.media.length}</strong>
          </div>
          {profile.media.length === 0 ? (
            <div className="empty-detail-slot">No visible videos</div>
          ) : (
            <ol className="boulderer-video-list">
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
