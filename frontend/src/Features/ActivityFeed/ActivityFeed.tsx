import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addAscentComment,
  deleteAscentComment,
  fetchAscentCommentsBatch,
  updateAscentComment
} from "../../Api/ascentCommentApi";
import { fetchRecentBoulderMedia } from "../../Api/mediaApi";
import type {
  AscentComment,
  BoulderMedia,
  BoulderPageIdentity,
  BoulderRecord
} from "../../Types/boulderTypes";
import {
  ascentTimestamp,
  boulderKey,
  recordKey,
  timestamp
} from "../../Utilities/activityFeedUtils";
import sharedStyles from "../../Styles/Shared.module.css";
import ActivityAscentFeedItem from "./ActivityAscentFeedItem";
import styles from "./ActivityFeed.module.css";
import ActivityVideoFeedItem from "./ActivityVideoFeedItem";

type ActivityFeedProps = {
  currentUsername: string | null;
  selectedClimber: string;
  records: BoulderRecord[];
  onError: (message: string) => void;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
  onOpenBoulderer: (username: string) => void;
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

function compareFeedItems(left: FeedItem, right: FeedItem): number {
  return right.timestamp - left.timestamp || right.key.localeCompare(left.key);
}

export default function ActivityFeed({
  currentUsername,
  selectedClimber,
  records,
  onError,
  onOpenBoulder,
  onOpenBoulderer
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
  }, [currentUsername, onError]);

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

  return (
    <section className={`${sharedStyles.panel} ${styles.panel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Feed</span>
        <h2>Latest activity</h2>
      </div>
      {feedItems.length === 0 ? (
        <div className={sharedStyles.emptyDetailSlot}>-</div>
      ) : (
        <ol className={styles.list}>
          {feedItems.map((item) => {
            if (item.kind === "video") {
              return (
                <ActivityVideoFeedItem
                  itemKey={item.key}
                  key={item.key}
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
                itemKey={item.key}
                key={item.key}
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
