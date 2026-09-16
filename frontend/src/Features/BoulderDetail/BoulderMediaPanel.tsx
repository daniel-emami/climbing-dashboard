import { useState, type FormEvent } from "react";

import { mediaUrl } from "../../Api/mediaApi";
import type { BoulderMedia, BoulderMediaUploadRequest } from "../../Types/boulderTypes";
import sharedStyles from "../../Styles/Shared.module.css";
import styles from "./BoulderDetailPage.module.css";

type BoulderMediaPanelProps = {
  currentUserId: number | null;
  currentUsername: string | null;
  hasCurrentUserAscent: boolean;
  isLoading: boolean;
  isSaving: boolean;
  media: BoulderMedia[];
  onDeleteMedia: (mediaId: number) => Promise<void>;
  onUploadVideo: (
    request: Omit<BoulderMediaUploadRequest, "name" | "area" | "sector">
  ) => Promise<void>;
};

function formatCommentTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}

function formatMediaSize(value: number): string {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function BoulderMediaPanel({
  currentUserId,
  currentUsername,
  hasCurrentUserAscent,
  isLoading,
  isSaving,
  media,
  onDeleteMedia,
  onUploadVideo
}: BoulderMediaPanelProps) {
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const submitVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUsername || !hasCurrentUserAscent || !mediaFile) {
      return;
    }
    await onUploadVideo({
      caption: mediaCaption.trim(),
      file: mediaFile
    });
    setMediaCaption("");
    setMediaFile(null);
    event.currentTarget.reset();
  };

  const deleteMedia = async (mediaItem: BoulderMedia) => {
    const shouldDelete = window.confirm(
      `Delete video from ${mediaItem.climber_display_name}?`
    );
    if (!shouldDelete) {
      return;
    }
    await onDeleteMedia(mediaItem.id);
  };

  return (
    <section className={`${sharedStyles.panel} ${styles.fullWidthPanel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Videos</span>
        <span className={styles.count}>{media.length}</span>
      </div>
      {isLoading ? (
        <div className={sharedStyles.emptyDetailSlot}>Loading</div>
      ) : media.length === 0 ? (
        <div className={sharedStyles.emptyDetailSlot}>-</div>
      ) : (
        <ol className={styles.mediaList}>
          {media.map((mediaItem) => {
            const canDeleteMedia =
              currentUserId !== null &&
              (mediaItem.user_id === currentUserId ||
                (mediaItem.user_id === null &&
                  currentUsername !== null &&
                  mediaItem.climber.toLocaleLowerCase() ===
                    currentUsername.toLocaleLowerCase()));
            return (
              <li className={styles.mediaItem} key={mediaItem.id}>
                <video
                  controls
                  crossOrigin="use-credentials"
                  playsInline
                  preload="metadata"
                  src={mediaUrl(mediaItem.url)}
                />
                <div className={styles.mediaMeta}>
                  <strong>{mediaItem.climber_display_name}</strong>
                  <span>
                    {formatCommentTime(mediaItem.created_at)} ·{" "}
                    {formatMediaSize(mediaItem.file_size)}
                    {mediaItem.visibility === "private" ? " · Private" : ""}
                  </span>
                </div>
                {mediaItem.caption && <p>{mediaItem.caption}</p>}
                {canDeleteMedia && (
                  <div className={styles.commentActions}>
                    <button
                      className={styles.dangerButton}
                      disabled={isSaving}
                      type="button"
                      onClick={() => void deleteMedia(mediaItem)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <form className={styles.mediaUploadForm} onSubmit={(event) => void submitVideo(event)}>
        <label>
          Caption
          <input
            disabled={!hasCurrentUserAscent}
            value={mediaCaption}
            onChange={(event) => setMediaCaption(event.target.value)}
          />
        </label>
        <label>
          Video file
          <input
            required
            accept="video/*"
            disabled={!hasCurrentUserAscent}
            type="file"
            onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button
          disabled={isSaving || !hasCurrentUserAscent || !mediaFile}
          type="submit"
        >
          {!currentUsername
            ? "Login To Upload"
            : hasCurrentUserAscent
              ? "Upload"
              : "Log Ascent To Upload"}
        </button>
      </form>
    </section>
  );
}
