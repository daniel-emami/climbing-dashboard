import { useEffect, useState, type FormEvent } from "react";
import {
  addAscentComment,
  deleteAscentComment,
  updateAscentComment
} from "../../Api/ascentCommentApi";
import type { FeedItem } from "../../Api/feedApi";
import type { AscentComment, BoulderPageIdentity } from "../../Types/boulderTypes";
import ActivityAscentFeedItem from "./ActivityAscentFeedItem";
import styles from "./ActivityFeed.module.css";
import ActivityVideoFeedItem from "./ActivityVideoFeedItem";

type ActivityFeedProps = {
  currentUsername: string | null;
  items: FeedItem[];
  onError: (message: string) => void;
  onRefresh: () => void;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
  onOpenBoulderer: (username: string) => void;
};

type CommentDraft = {
  body: string;
};

export default function ActivityFeed({
  currentUsername,
  items,
  onError,
  onRefresh,
  onOpenBoulder,
  onOpenBoulderer
}: ActivityFeedProps) {
  const [commentsByAscentId, setCommentsByAscentId] = useState<Record<number, AscentComment[]>>(
    {}
  );
  const [draftsByAscentId, setDraftsByAscentId] = useState<Record<number, CommentDraft>>({});
  const [savingAscentIds, setSavingAscentIds] = useState<Set<number>>(new Set());
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<CommentDraft>({ body: "" });

  useEffect(() => {
    const nextComments: Record<number, AscentComment[]> = {};
    for (const item of items) {
      if (item.kind === "ascent" && item.record.ascent_id !== null) {
        nextComments[item.record.ascent_id] = item.comments;
      }
    }
    setCommentsByAscentId(nextComments);
  }, [items]);

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
      onRefresh();
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
      onRefresh();
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
      onRefresh();
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
    <section className={styles.feed}>
      <div className={styles.feedHeading}>
        <span className={styles.kicker}>Feed</span>
        <h1>Latest activity</h1>
      </div>
      {items.length === 0 ? (
        <p className={styles.empty}>No activity yet. Add an ascent to get things started.</p>
      ) : (
        <ol className={styles.list}>
          {items.map((item) => {
            if (item.kind === "video") {
              return (
                <ActivityVideoFeedItem
                  itemKey={`video-${item.media.id}`}
                  key={`video-${item.media.id}`}
                  media={item.media}
                  onOpenBoulder={onOpenBoulder}
                  onOpenBoulderer={onOpenBoulderer}
                />
              );
            }

            const ascentId = item.record.ascent_id;
            return (
              <ActivityAscentFeedItem
                comments={ascentId === null ? [] : commentsByAscentId[ascentId] ?? []}
                currentUsername={currentUsername}
                draftBody={ascentId === null ? "" : draftForAscent(ascentId).body}
                editingCommentId={editingCommentId}
                editingDraftBody={editingDraft.body}
                isSavingComment={ascentId !== null && savingAscentIds.has(ascentId)}
                itemKey={`ascent-${ascentId}`}
                key={`ascent-${ascentId}`}
                record={item.record}
                onCancelEditingComment={cancelEditingComment}
                onChangeDraft={(nextAscentId, body) => updateDraft(nextAscentId, { body })}
                onChangeEditingDraft={(body) => setEditingDraft({ body })}
                onOpenBoulder={onOpenBoulder}
                onOpenBoulderer={onOpenBoulderer}
                onRemoveComment={(comment) => void removeComment(comment)}
                onSaveEditingComment={(comment) => void saveEditingComment(comment)}
                onStartEditingComment={startEditingComment}
                onSubmitComment={(event, nextAscentId) =>
                  void submitComment(event, nextAscentId)
                }
              />
            );
          })}
        </ol>
      )}
    </section>
  );
}
