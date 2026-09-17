import type { FormEvent } from "react";
import type {
  AscentComment,
  BoulderPageIdentity,
  BoulderRecord
} from "../../Types/boulderTypes";
import {
  boulderIdentityFromRecord,
  formatDate,
  formatDateTime,
  formatGrade,
  formatLocation,
  formatRating,
  initials
} from "../../Utilities/activityFeedUtils";
import sharedStyles from "../../Styles/Shared.module.css";
import styles from "./ActivityFeed.module.css";

type ActivityAscentFeedItemProps = {
  comments: AscentComment[];
  currentUsername: string | null;
  draftBody: string;
  editingCommentId: number | null;
  editingDraftBody: string;
  isSavingComment: boolean;
  itemKey: string;
  record: BoulderRecord;
  onCancelEditingComment: () => void;
  onChangeDraft: (ascentId: number, body: string) => void;
  onChangeEditingDraft: (body: string) => void;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
  onOpenBoulderer: (username: string) => void;
  onRemoveComment: (comment: AscentComment) => void;
  onSaveEditingComment: (comment: AscentComment) => void;
  onStartEditingComment: (comment: AscentComment) => void;
  onSubmitComment: (event: FormEvent<HTMLFormElement>, ascentId: number) => void;
};

export default function ActivityAscentFeedItem({
  comments,
  currentUsername,
  draftBody,
  editingCommentId,
  editingDraftBody,
  isSavingComment,
  itemKey,
  record,
  onCancelEditingComment,
  onChangeDraft,
  onChangeEditingDraft,
  onOpenBoulder,
  onOpenBoulderer,
  onRemoveComment,
  onSaveEditingComment,
  onStartEditingComment,
  onSubmitComment
}: ActivityAscentFeedItemProps) {
  const rating = formatRating(record.rating);
  const ascentId = record.ascent_id;

  return (
    <li className={styles.item} key={itemKey}>
      <button
        aria-label={`Open ${record.climber_display_name || record.climber}'s profile`}
        className={styles.avatar}
        type="button"
        onClick={() => onOpenBoulderer(record.climber)}
      >
        {initials(record.climber_display_name)}
      </button>
      <div className={styles.body}>
        <p className={styles.copy}>
          <button
            className={sharedStyles.profileLinkButton}
            type="button"
            onClick={() => onOpenBoulderer(record.climber)}
          >
            {record.climber_display_name || "Unknown climber"}
          </button>{" "}
          {record.flash ? "flashed" : "logged"}{" "}
          <button
            className={styles.boulderLink}
            type="button"
            onClick={() => onOpenBoulder(boulderIdentityFromRecord(record))}
          >
            {record.name}
          </button>
        </p>
        <p className={styles.meta}>
          {formatLocation(record)} · {formatGrade(record)}
          {rating ? ` · ${rating}` : ""}
        </p>
        <p className={styles.time}>
          Climbed {formatDate(record.climbed_on)} · Added {formatDate(record.added_at)}
        </p>
        <div className={styles.comments}>
          {comments.length > 0 && (
            <ol className={styles.commentList}>
              {comments.map((comment) => {
                const isEditing = editingCommentId === comment.id;
                const canEditComment =
                  currentUsername !== null &&
                  comment.climber.toLocaleLowerCase() === currentUsername.toLocaleLowerCase();
                return (
                  <li className={styles.commentItem} key={comment.id}>
                    {isEditing ? (
                      <div className={styles.commentEditForm}>
                        <input
                          aria-label="Comment"
                          value={editingDraftBody}
                          onChange={(event) => onChangeEditingDraft(event.target.value)}
                        />
                        <button
                          disabled={isSavingComment || !canEditComment}
                          type="button"
                          onClick={() => onSaveEditingComment(comment)}
                        >
                          Save
                        </button>
                        <button
                          disabled={isSavingComment}
                          type="button"
                          onClick={onCancelEditingComment}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <p>
                          <button
                            className={sharedStyles.profileLinkButton}
                            type="button"
                            onClick={() => onOpenBoulderer(comment.climber)}
                          >
                            {comment.climber_display_name}
                          </button>{" "}
                          {comment.body}
                        </p>
                        <div className={styles.commentActions}>
                          <span>{formatDateTime(comment.created_at)}</span>
                          {canEditComment && (
                            <>
                              <button
                                disabled={isSavingComment}
                                type="button"
                                onClick={() => onStartEditingComment(comment)}
                              >
                                Edit
                              </button>
                              <button
                                className={styles.dangerButton}
                                disabled={isSavingComment}
                                type="button"
                                onClick={() => onRemoveComment(comment)}
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
              className={styles.commentForm}
              onSubmit={(event) => onSubmitComment(event, ascentId)}
            >
              <input
                aria-label="Ascent comment"
                disabled={!currentUsername}
                placeholder={currentUsername ? "Comment on this ascent" : "Log in to comment"}
                value={draftBody}
                onChange={(event) => onChangeDraft(ascentId, event.target.value)}
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
}
