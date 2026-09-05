import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addAscentComment,
  deleteAscentComment,
  fetchAscentCommentsBatch,
  updateAscentComment
} from "../Api/ascentCommentApi";
import { fetchRecentBoulderMedia, mediaUrl } from "../Api/mediaApi";
import type {
  AscentComment,
  BoulderMedia,
  BoulderPageIdentity,
  BoulderRecord
} from "../Types/boulderTypes";

type ActivityFeedProps = {
  currentUsername: string | null;
  selectedClimber: string;
  records: BoulderRecord[];
  onError: (message: string) => void;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
};

type AscentFeedItem = {
  kind: "ascent";
  key: string;
  timestamp: number;
  record: BoulderRecord;
};

type VideoFeedItem = {
  kind: "video";
  key: string;
  timestamp: number;
  media: BoulderMedia;
};

type FeedItem = AscentFeedItem | VideoFeedItem;

const FEED_LIMIT = 30;
const RECENT_MEDIA_LIMIT = 60;

type CommentDraft = {
  body: string;
};

function parsedDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalizedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function timestamp(value: string | null): number {
  return parsedDate(value)?.getTime() ?? 0;
}

function ascentTimestamp(record: BoulderRecord): number {
  return timestamp(record.climbed_on) || timestamp(record.added_at);
}

function compareFeedItems(left: FeedItem, right: FeedItem): number {
  return right.timestamp - left.timestamp || right.key.localeCompare(left.key);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = parsedDate(value);
  if (!parsed) {
    return value;
  }
  return parsed.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(value: string): string {
  const parsed = parsedDate(value);
  if (!parsed) {
    return value.replace("T", " ").slice(0, 16);
  }
  return parsed.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatLocation(record: BoulderRecord): string {
  return [record.area, record.sector].filter(Boolean).join(" / ");
}

function formatMediaLocation(media: BoulderMedia): string {
  return [media.area, media.sector].filter(Boolean).join(" / ");
}

function formatGrade(record: BoulderRecord): string {
  const grades = [
    record.own_grade ? `Own ${record.own_grade}` : "",
    record.grade_27crags ? `27Crags ${record.grade_27crags}` : "",
    record.guide_grade ? `Guide ${record.guide_grade}` : ""
  ].filter(Boolean);
  return grades.length > 0 ? grades.join(" · ") : "Ungraded";
}

function formatRating(rating: number | null): string {
  return rating === null ? "" : `${rating}/5`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+|_/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function boulderKey(name: string, area: string, sector: string): string {
  return [name, area, sector].map((value) => value.trim().toLocaleLowerCase()).join("|");
}

function boulderIdentityFromRecord(record: BoulderRecord): BoulderPageIdentity {
  return {
    name: record.name,
    area: record.area,
    sector: record.sector
  };
}

function boulderIdentityFromMedia(media: BoulderMedia): BoulderPageIdentity {
  return {
    name: media.boulder_name,
    area: media.area,
    sector: media.sector
  };
}

function recordKey(record: BoulderRecord): string {
  return (
    record.ascent_id?.toString() ??
    `${record.name}-${record.area}-${record.sector}-${record.climber}-${record.added_at}-${record.climbed_on}`
  );
}

export default function ActivityFeed({
  currentUsername,
  selectedClimber,
  records,
  onError,
  onOpenBoulder
}: ActivityFeedProps) {
  const [recentMedia, setRecentMedia] = useState<BoulderMedia[]>([]);
  const [commentsByAscentId, setCommentsByAscentId] = useState<Record<number, AscentComment[]>>(
    {}
  );
  const [draftsByAscentId, setDraftsByAscentId] = useState<Record<number, CommentDraft>>({});
  const [savingAscentIds, setSavingAscentIds] = useState<Set<number>>(new Set());
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<CommentDraft>({ body: "" });

  useEffect(() => {
    let ignoreResult = false;
    fetchRecentBoulderMedia(RECENT_MEDIA_LIMIT)
      .then((payload) => {
        if (!ignoreResult) {
          setRecentMedia(payload.media);
        }
      })
      .catch((unknownError: unknown) => {
        if (!ignoreResult) {
          onError(unknownError instanceof Error ? unknownError.message : "Unknown media error");
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [onError]);

  const visibleBoulderKeys = useMemo(
    () =>
      new Set(
        records.map((record) => boulderKey(record.name, record.area, record.sector))
      ),
    [records]
  );

  const visibleMedia = useMemo(
    () =>
      recentMedia.filter(
        (media) =>
          visibleBoulderKeys.has(boulderKey(media.boulder_name, media.area, media.sector)) &&
          (!selectedClimber || media.climber === selectedClimber)
      ),
    [recentMedia, selectedClimber, visibleBoulderKeys]
  );

  const feedItems = useMemo<FeedItem[]>(
    () =>
      [
        ...records.map<AscentFeedItem>((record) => ({
          kind: "ascent",
          key: `ascent-${recordKey(record)}`,
          timestamp: ascentTimestamp(record),
          record
        })),
        ...visibleMedia.map<VideoFeedItem>((media) => ({
          kind: "video",
          key: `video-${media.id}`,
          timestamp: timestamp(media.created_at),
          media
        }))
      ]
        .sort(compareFeedItems)
        .slice(0, FEED_LIMIT),
    [records, visibleMedia]
  );

  const feedAscentIds = useMemo(
    () =>
      feedItems
        .filter((item): item is AscentFeedItem => item.kind === "ascent")
        .map((item) => item.record.ascent_id)
        .filter((ascentId): ascentId is number => ascentId !== null && ascentId > 0),
    [feedItems]
  );

  useEffect(() => {
    if (feedAscentIds.length === 0) {
      setCommentsByAscentId({});
      return;
    }

    let ignoreResult = false;
    fetchAscentCommentsBatch(feedAscentIds)
      .then((payload) => {
        if (ignoreResult) {
          return;
        }
        const nextComments: Record<number, AscentComment[]> = {};
        for (const ascentId of feedAscentIds) {
          nextComments[ascentId] =
            payload.comments_by_ascent_id[String(ascentId)] ?? [];
        }
        setCommentsByAscentId(nextComments);
      })
      .catch((unknownError: unknown) => {
        if (!ignoreResult) {
          onError(
            unknownError instanceof Error ? unknownError.message : "Unknown ascent comment error"
          );
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [feedAscentIds, onError]);

  const draftForAscent = (ascentId: number): CommentDraft =>
    draftsByAscentId[ascentId] ?? { body: "" };

  const updateDraft = (ascentId: number, draft: CommentDraft) => {
    setDraftsByAscentId((current) => ({ ...current, [ascentId]: draft }));
  };

  const setSaving = (ascentId: number, isSaving: boolean) => {
    setSavingAscentIds((current) => {
      const next = new Set(current);
      if (isSaving) {
        next.add(ascentId);
      } else {
        next.delete(ascentId);
      }
      return next;
    });
  };

  const submitComment = async (
    event: FormEvent<HTMLFormElement>,
    ascentId: number
  ) => {
    event.preventDefault();
    const draft = draftForAscent(ascentId);
    const body = draft.body.trim();
    if (!currentUsername || !body) {
      return;
    }

    setSaving(ascentId, true);
    try {
      const payload = await addAscentComment({ ascent_id: ascentId, body });
      setCommentsByAscentId((current) => ({ ...current, [ascentId]: payload.comments }));
      updateDraft(ascentId, { body: "" });
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown ascent comment error");
    } finally {
      setSaving(ascentId, false);
    }
  };

  const startEditingComment = (comment: AscentComment) => {
    setEditingCommentId(comment.id);
    setEditingDraft({ body: comment.body });
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingDraft({ body: "" });
  };

  const saveEditingComment = async (comment: AscentComment) => {
    const body = editingDraft.body.trim();
    if (!currentUsername || !body) {
      return;
    }
    setSaving(comment.ascent_id, true);
    try {
      const payload = await updateAscentComment(comment.id, { body });
      setCommentsByAscentId((current) => ({
        ...current,
        [comment.ascent_id]: payload.comments
      }));
      cancelEditingComment();
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown ascent comment error");
    } finally {
      setSaving(comment.ascent_id, false);
    }
  };

  const removeComment = async (comment: AscentComment) => {
    const shouldDelete = window.confirm(
      `Delete comment from ${comment.climber_display_name}?`
    );
    if (!shouldDelete) {
      return;
    }
    setSaving(comment.ascent_id, true);
    try {
      const payload = await deleteAscentComment(comment.id);
      setCommentsByAscentId((current) => ({
        ...current,
        [comment.ascent_id]: payload.comments
      }));
      if (editingCommentId === comment.id) {
        cancelEditingComment();
      }
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown ascent comment error");
    } finally {
      setSaving(comment.ascent_id, false);
    }
  };

  const renderAscentItem = (item: AscentFeedItem) => {
    const { record } = item;
    const rating = formatRating(record.rating);
    const ascentId = record.ascent_id;
    const comments = ascentId === null ? [] : commentsByAscentId[ascentId] ?? [];
    const draft = ascentId === null ? { body: "" } : draftForAscent(ascentId);
    const isSavingComment = ascentId !== null && savingAscentIds.has(ascentId);

    return (
      <li className="activity-feed-item" key={item.key}>
        <div className="activity-feed-avatar" aria-hidden="true">
          {initials(record.climber_display_name)}
        </div>
        <div className="activity-feed-body">
          <p className="activity-feed-copy">
            <strong>{record.climber_display_name || "Unknown climber"}</strong>{" "}
            {record.flash ? "flashed" : "logged"}{" "}
            <button
              className="activity-feed-link"
              type="button"
              onClick={() => onOpenBoulder(boulderIdentityFromRecord(record))}
            >
              {record.name}
            </button>
          </p>
          <p className="activity-feed-meta">
            {formatLocation(record)} · {formatGrade(record)}
            {rating ? ` · ${rating}` : ""}
          </p>
          <p className="activity-feed-time">
            Climbed {formatDate(record.climbed_on)} · Added {formatDate(record.added_at)}
          </p>
          <div className="activity-ascent-comments">
            {comments.length > 0 && (
              <ol className="activity-comment-list">
                {comments.map((comment) => {
                  const isEditing = editingCommentId === comment.id;
                  const canEditComment =
                    currentUsername !== null &&
                    comment.climber.toLocaleLowerCase() === currentUsername.toLocaleLowerCase();
                  return (
                    <li className="activity-comment-item" key={comment.id}>
                      {isEditing ? (
                        <div className="activity-comment-edit-form">
                          <input
                            aria-label="Comment"
                            value={editingDraft.body}
                            onChange={(event) =>
                              setEditingDraft((current) => ({
                                ...current,
                                body: event.target.value
                              }))
                            }
                          />
                          <button
                            disabled={isSavingComment || !canEditComment}
                            type="button"
                            onClick={() => void saveEditingComment(comment)}
                          >
                            Save
                          </button>
                          <button
                            disabled={isSavingComment}
                            type="button"
                            onClick={cancelEditingComment}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p>
                            <strong>{comment.climber_display_name}</strong> {comment.body}
                          </p>
                          <div className="activity-comment-actions">
                            <span>{formatDateTime(comment.created_at)}</span>
                            {canEditComment && (
                              <>
                                <button
                                  disabled={isSavingComment}
                                  type="button"
                                  onClick={() => startEditingComment(comment)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="danger-button"
                                  disabled={isSavingComment}
                                  type="button"
                                  onClick={() => void removeComment(comment)}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {ascentId !== null && (
              <form
                className="activity-comment-form"
                onSubmit={(event) => void submitComment(event, ascentId)}
              >
                <input
                  aria-label="Ascent comment"
                  disabled={!currentUsername}
                  placeholder={currentUsername ? "Comment on this ascent" : "Log in to comment"}
                  value={draft.body}
                  onChange={(event) =>
                    updateDraft(ascentId, { ...draft, body: event.target.value })
                  }
                />
                <button disabled={isSavingComment || !currentUsername} type="submit">
                  {currentUsername ? "Post" : "Login To Post"}
                </button>
              </form>
            )}
          </div>
        </div>
      </li>
    );
  };

  const renderVideoItem = (item: VideoFeedItem) => {
    const { media } = item;
    return (
      <li className="activity-feed-item activity-video-feed-item" key={item.key}>
        <div className="activity-feed-avatar" aria-hidden="true">
          {initials(media.climber_display_name)}
        </div>
        <div className="activity-feed-body">
          <p className="activity-feed-copy">
            <strong>{media.climber_display_name || "Unknown climber"}</strong> uploaded a video to{" "}
            <button
              className="activity-feed-link"
              type="button"
              onClick={() => onOpenBoulder(boulderIdentityFromMedia(media))}
            >
              {media.boulder_name}
            </button>
          </p>
          <p className="activity-feed-meta">{formatMediaLocation(media)}</p>
          <p className="activity-feed-time">Uploaded {formatDateTime(media.created_at)}</p>
          <ol className="activity-media-list">
            <li className="activity-media-item">
              <video controls playsInline preload="metadata" src={mediaUrl(media.url)} />
              {media.caption && <p>{media.caption}</p>}
            </li>
          </ol>
        </div>
      </li>
    );
  };

  return (
    <section className="panel activity-feed-panel">
      <div className="panel-heading">
        <span className="section-kicker">Feed</span>
        <h2>Latest activity</h2>
      </div>
      {feedItems.length === 0 ? (
        <div className="empty-detail-slot">-</div>
      ) : (
        <ol className="activity-feed-list">
          {feedItems.map((item) =>
            item.kind === "ascent" ? renderAscentItem(item) : renderVideoItem(item)
          )}
        </ol>
      )}
    </section>
  );
}
