import { useState, type FormEvent } from "react";

import type { BoulderComment, BoulderCommentUpdateRequest } from "../../Types/boulderTypes";
import sharedStyles from "../../Styles/Shared.module.css";
import styles from "./BoulderDetailPage.module.css";

type BoulderCommentsPanelProps = {
  comments: BoulderComment[];
  currentUsername: string | null;
  isLoading: boolean;
  isSaving: boolean;
  onAddComment: (body: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onOpenBoulderer: (username: string) => void;
  onUpdateComment: (
    commentId: number,
    request: BoulderCommentUpdateRequest
  ) => Promise<void>;
};

function formatCommentTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}

export default function BoulderCommentsPanel({
  comments,
  currentUsername,
  isLoading,
  isSaving,
  onAddComment,
  onDeleteComment,
  onOpenBoulderer,
  onUpdateComment
}: BoulderCommentsPanelProps) {
  const [commentBody, setCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = commentBody.trim();
    if (!currentUsername || !body) {
      return;
    }
    await onAddComment(body);
    setCommentBody("");
  };

  const startEditingComment = (comment: BoulderComment) => {
    setEditingCommentId(comment.id);
    setEditingBody(comment.body);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingBody("");
  };

  const saveEditingComment = async () => {
    if (editingCommentId === null) {
      return;
    }
    const body = editingBody.trim();
    if (!currentUsername || !body) {
      return;
    }
    await onUpdateComment(editingCommentId, { body });
    cancelEditingComment();
  };

  const deleteComment = async (comment: BoulderComment) => {
    const shouldDelete = window.confirm(
      `Delete comment from ${comment.climber_display_name}?`
    );
    if (!shouldDelete) {
      return;
    }
    await onDeleteComment(comment.id);
    if (editingCommentId === comment.id) {
      cancelEditingComment();
    }
  };

  return (
    <section className={`${sharedStyles.panel} ${styles.fullWidthPanel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Comments</span>
        <span className={styles.count}>{comments.length}</span>
      </div>
      {isLoading ? (
        <div className={sharedStyles.emptyDetailSlot}>Loading</div>
      ) : comments.length === 0 ? (
        <div className={sharedStyles.emptyDetailSlot}>-</div>
      ) : (
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
                    <label>
                      Comment
                      <textarea
                        required
                        rows={3}
                        value={editingBody}
                        onChange={(event) => setEditingBody(event.target.value)}
                      />
                    </label>
                    <div className={styles.commentActions}>
                      <button
                        disabled={isSaving || !canEditComment}
                        type="button"
                        onClick={() => void saveEditingComment()}
                      >
                        Save
                      </button>
                      <button
                        disabled={isSaving}
                        type="button"
                        onClick={cancelEditingComment}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.commentMeta}>
                      <button
                        className={sharedStyles.profileLinkButton}
                        type="button"
                        onClick={() => onOpenBoulderer(comment.climber)}
                      >
                        {comment.climber_display_name}
                      </button>
                      <span>{formatCommentTime(comment.created_at)}</span>
                    </div>
                    <p>{comment.body}</p>
                    {canEditComment && (
                      <div className={styles.commentActions}>
                        <button
                          disabled={isSaving}
                          type="button"
                          onClick={() => startEditingComment(comment)}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.dangerButton}
                          disabled={isSaving}
                          type="button"
                          onClick={() => void deleteComment(comment)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <form className={styles.commentForm} onSubmit={(event) => void submitComment(event)}>
        <label>
          Comment
          <textarea
            required
            disabled={!currentUsername}
            rows={3}
            value={commentBody}
            placeholder={currentUsername ? "" : "Log in to comment"}
            onChange={(event) => setCommentBody(event.target.value)}
          />
        </label>
        <button disabled={isSaving || !currentUsername} type="submit">
          {currentUsername ? "Post" : "Login To Post"}
        </button>
      </form>
    </section>
  );
}
