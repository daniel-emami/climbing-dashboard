import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addAscentComment,
  deleteAscentComment,
  fetchAscentCommentsBatch,
  updateAscentComment
} from "../Api/ascentCommentApi";
import type {
  AscentComment,
  BoulderPageIdentity,
  BoulderRecord
} from "../Types/boulderTypes";

type ActivityFeedProps = {
  currentClimber: string;
  knownClimbers: string[];
  records: BoulderRecord[];
  onError: (message: string) => void;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
};

const FEED_LIMIT = 30;

type CommentDraft = {
  climber: string;
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

function compareFeedRecords(left: BoulderRecord, right: BoulderRecord): number {
  return (
    timestamp(right.climbed_on) - timestamp(left.climbed_on) ||
    timestamp(right.added_at) - timestamp(left.added_at)
  );
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

function formatCommentTime(value: string): string {
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

export default function ActivityFeed({
  currentClimber,
  knownClimbers,
  records,
  onError,
  onOpenBoulder
}: ActivityFeedProps) {
  const [commentsByAscentId, setCommentsByAscentId] = useState<Record<number, AscentComment[]>>(
    {}
  );
  const [draftsByAscentId, setDraftsByAscentId] = useState<Record<number, CommentDraft>>({});
  const [savingAscentIds, setSavingAscentIds] = useState<Set<number>>(new Set());
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<CommentDraft>({ climber: "", body: "" });
  const feedRecords = useMemo(
    () =>
      records
        .slice()
        .sort(compareFeedRecords)
        .slice(0, FEED_LIMIT),
    [records]
  );
  const feedAscentIds = useMemo(
    () =>
      feedRecords
        .map((record) => record.ascent_id)
        .filter((ascentId): ascentId is number => ascentId !== null && ascentId > 0),
    [feedRecords]
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
          nextComments[ascentId] = payload.comments_by_ascent_id[String(ascentId)] ?? [];
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

  const defaultClimber = currentClimber || knownClimbers[0] || "";

  const draftForAscent = (ascentId: number): CommentDraft =>
    draftsByAscentId[ascentId] ?? { climber: defaultClimber, body: "" };

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
    const climber = draft.climber.trim();
    const body = draft.body.trim();
    if (!climber || !body) {
      return;
    }

    setSaving(ascentId, true);
    try {
      const payload = await addAscentComment({ ascent_id: ascentId, climber, body });
      setCommentsByAscentId((current) => ({ ...current, [ascentId]: payload.comments }));
      updateDraft(ascentId, { climber, body: "" });
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown ascent comment error");
    } finally {
      setSaving(ascentId, false);
    }
  };

  const startEditingComment = (comment: AscentComment) => {
    setEditingCommentId(comment.id);
    setEditingDraft({ climber: comment.climber, body: comment.body });
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingDraft({ climber: "", body: "" });
  };

  const saveEditingComment = async (comment: AscentComment) => {
    const climber = editingDraft.climber.trim();
    const body = editingDraft.body.trim();
    if (!climber || !body) {
      return;
    }
    setSaving(comment.ascent_id, true);
    try {
      const payload = await updateAscentComment(comment.id, { climber, body });
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
    const shouldDelete = window.confirm(`Delete comment from ${comment.climber}?`);
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

  return (
    <section className="panel activity-feed-panel">
      <div className="panel-heading">
        <span className="section-kicker">Feed</span>
        <h2>Latest ascents</h2>
      </div>
      {feedRecords.length === 0 ? (
        <div className="empty-detail-slot">-</div>
      ) : (
        <ol className="activity-feed-list">
          {feedRecords.map((record) => {
            const rating = formatRating(record.rating);
            const ascentId = record.ascent_id;
            const comments = ascentId === null ? [] : commentsByAscentId[ascentId] ?? [];
            const draft = ascentId === null ? { climber: "", body: "" } : draftForAscent(ascentId);
            const isSavingComment = ascentId !== null && savingAscentIds.has(ascentId);
            return (
              <li
                className="activity-feed-item"
                key={
                  record.ascent_id ??
                  `${record.name}-${record.area}-${record.sector}-${record.climber}-${record.added_at}-${record.climbed_on}`
                }
              >
                <div className="activity-feed-avatar" aria-hidden="true">
                  {initials(record.climber)}
                </div>
                <div className="activity-feed-body">
                  <p className="activity-feed-copy">
                    <strong>{record.climber || "Unknown climber"}</strong>{" "}
                    {record.flash ? "flashed" : "logged"}{" "}
                    <button
                      className="activity-feed-link"
                      type="button"
                      onClick={() =>
                        onOpenBoulder({
                          name: record.name,
                          area: record.area,
                          sector: record.sector
                        })
                      }
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
                          return (
                            <li className="activity-comment-item" key={comment.id}>
                              {isEditing ? (
                                <div className="activity-comment-edit-form">
                                  <input
                                    aria-label="Comment climber"
                                    list="feed-comment-climbers"
                                    value={editingDraft.climber}
                                    onChange={(event) =>
                                      setEditingDraft((current) => ({
                                        ...current,
                                        climber: event.target.value
                                      }))
                                    }
                                  />
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
                                    disabled={isSavingComment}
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
                                    <strong>{comment.climber}</strong> {comment.body}
                                  </p>
                                  <div className="activity-comment-actions">
                                    <span>{formatCommentTime(comment.created_at)}</span>
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
                          aria-label="Comment climber"
                          list="feed-comment-climbers"
                          placeholder="Climber"
                          value={draft.climber}
                          onChange={(event) =>
                            updateDraft(ascentId, { ...draft, climber: event.target.value })
                          }
                        />
                        <input
                          aria-label="Ascent comment"
                          placeholder="Comment on this ascent"
                          value={draft.body}
                          onChange={(event) =>
                            updateDraft(ascentId, { ...draft, body: event.target.value })
                          }
                        />
                        <button disabled={isSavingComment} type="submit">
                          Post
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <datalist id="feed-comment-climbers">
        {knownClimbers.map((climber) => (
          <option key={climber} value={climber} />
        ))}
      </datalist>
    </section>
  );
}
