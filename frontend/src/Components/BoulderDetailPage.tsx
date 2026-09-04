import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  BoulderComment,
  BoulderCommentUpdateRequest,
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderPageIdentity,
  BoulderRecord
} from "../Types/boulderTypes";

type BoulderDetailPageProps = {
  identity: BoulderPageIdentity;
  gradeOrder: string[];
  comments: BoulderComment[];
  isSaving: boolean;
  isCommentsLoading: boolean;
  isCommentSaving: boolean;
  records: BoulderRecord[];
  onAddComment: (climber: string, body: string) => Promise<void>;
  onBack: () => void;
  onDeleteComment: (commentId: number) => Promise<void>;
  onUpdateComment: (
    commentId: number,
    request: BoulderCommentUpdateRequest
  ) => Promise<void>;
  onUpdate: (original: BoulderIdentity, boulder: BoulderCreateRequest) => Promise<void>;
};

type GradeSummary = {
  grade: string;
  count: number;
};

const RATING_OPTIONS = [1, 2, 3, 4, 5];

function compareDates(left: string | null, right: string | null): number {
  return (left ?? "").localeCompare(right ?? "");
}

function latestDate(records: BoulderRecord[]): string | null {
  const dates = records
    .map((record) => record.climbed_on)
    .filter((date): date is string => Boolean(date))
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

function gradeSummary(
  records: BoulderRecord[],
  field: "grade_27crags" | "guide_grade" | "own_grade",
  gradeOrder: string[]
): GradeSummary[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const grade = record[field];
    if (grade) {
      counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }
  }
  const gradeRank = new Map(gradeOrder.map((grade, index) => [grade, index]));
  return Array.from(counts.entries())
    .map(([grade, count]) => ({ grade, count }))
    .sort((left, right) => {
      const leftRank = gradeRank.get(left.grade);
      const rightRank = gradeRank.get(right.grade);
      if (leftRank !== undefined && rightRank !== undefined) {
        return leftRank - rightRank;
      }
      if (leftRank !== undefined) {
        return -1;
      }
      if (rightRank !== undefined) {
        return 1;
      }
      return left.grade.localeCompare(right.grade);
    });
}

function formatGradeSummary(summary: GradeSummary[]): string {
  if (summary.length === 0) {
    return "-";
  }
  return summary
    .map((entry) => (entry.count === 1 ? entry.grade : `${entry.grade} (${entry.count})`))
    .join(", ");
}

function recordToRequest(record: BoulderRecord): BoulderCreateRequest {
  return {
    name: record.name,
    grade_27crags: record.grade_27crags,
    guide_grade: record.guide_grade,
    own_grade: record.own_grade,
    area: record.area,
    climber: record.climber,
    flash: record.flash,
    climbed_on: record.climbed_on,
    rating: record.rating
  };
}

function averageRating(records: BoulderRecord[]): number | null {
  const ratings = records
    .map((record) => record.rating)
    .filter((rating): rating is number => rating !== null);
  if (ratings.length === 0) {
    return null;
  }
  return ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
}

function formatCommentTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}

function RatingButtons({
  disabled,
  rating,
  onChange
}: {
  disabled: boolean;
  rating: number | null;
  onChange: (rating: number | null) => void;
}) {
  return (
    <div className="rating-control" aria-label="Rating">
      {RATING_OPTIONS.map((option) => (
        <button
          className={rating === option ? "active" : ""}
          disabled={disabled}
          key={option}
          type="button"
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
      <button
        className="rating-clear-button"
        disabled={disabled || rating === null}
        type="button"
        onClick={() => onChange(null)}
      >
        Clear
      </button>
    </div>
  );
}

export default function BoulderDetailPage({
  identity,
  gradeOrder,
  comments,
  isSaving,
  isCommentsLoading,
  isCommentSaving,
  records,
  onAddComment,
  onBack,
  onDeleteComment,
  onUpdateComment,
  onUpdate
}: BoulderDetailPageProps) {
  const climberOptions = useMemo(
    () =>
      Array.from(new Set(records.map((record) => record.climber).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right)
      ),
    [records]
  );
  const [commentClimber, setCommentClimber] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingClimber, setEditingClimber] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const sortedRecords = records
    .slice()
    .sort((left, right) => compareDates(right.climbed_on, left.climbed_on));
  const flashCount = records.filter((record) => record.flash).length;
  const climberCount = new Set(records.map((record) => record.climber).filter(Boolean)).size;
  const latest = latestDate(records);
  const average = averageRating(records);
  const ratedCount = records.filter((record) => record.rating !== null).length;

  useEffect(() => {
    setCommentBody("");
    setEditingCommentId(null);
    setEditingClimber("");
    setEditingBody("");
    setCommentClimber((current) => current || climberOptions[0] || "");
  }, [climberOptions, identity.area, identity.name]);

  const updateRating = async (record: BoulderRecord, rating: number | null) => {
    try {
      await onUpdate(
        { name: record.name, area: record.area, climber: record.climber },
        {
          ...recordToRequest(record),
          rating
        }
      );
    } catch {
      return;
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const climber = commentClimber.trim();
    const body = commentBody.trim();
    if (!climber || !body) {
      return;
    }
    await onAddComment(climber, body);
    setCommentBody("");
  };

  const startEditingComment = (comment: BoulderComment) => {
    setEditingCommentId(comment.id);
    setEditingClimber(comment.climber);
    setEditingBody(comment.body);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingClimber("");
    setEditingBody("");
  };

  const saveEditingComment = async () => {
    if (editingCommentId === null) {
      return;
    }
    const climber = editingClimber.trim();
    const body = editingBody.trim();
    if (!climber || !body) {
      return;
    }
    await onUpdateComment(editingCommentId, { climber, body });
    cancelEditingComment();
  };

  const deleteComment = async (comment: BoulderComment) => {
    const shouldDelete = window.confirm(`Delete comment from ${comment.climber}?`);
    if (!shouldDelete) {
      return;
    }
    await onDeleteComment(comment.id);
    if (editingCommentId === comment.id) {
      cancelEditingComment();
    }
  };

  return (
    <section className="boulder-detail-page" aria-label="Boulder details">
      <button className="back-button" type="button" onClick={onBack}>
        Back
      </button>

      <section className="panel boulder-detail-hero">
        <div>
          <span className="section-kicker">Boulder</span>
          <h2>{identity.name}</h2>
          <p>{identity.area}</p>
        </div>
        <dl className="boulder-detail-stats" aria-label="Boulder summary">
          <div>
            <dt>Climbers</dt>
            <dd>{climberCount}</dd>
          </div>
          <div>
            <dt>Ascents</dt>
            <dd>{records.length}</dd>
          </div>
          <div>
            <dt>Flashes</dt>
            <dd>{flashCount}</dd>
          </div>
          <div>
            <dt>Latest</dt>
            <dd>{latest ?? "-"}</dd>
          </div>
        </dl>
      </section>

      <div className="boulder-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <span className="section-kicker">Grades</span>
          </div>
          <dl className="boulder-grade-list">
            <div>
              <dt>27Crags</dt>
              <dd>{formatGradeSummary(gradeSummary(records, "grade_27crags", gradeOrder))}</dd>
            </div>
            <div>
              <dt>Guide</dt>
              <dd>{formatGradeSummary(gradeSummary(records, "guide_grade", gradeOrder))}</dd>
            </div>
            <div>
              <dt>Own</dt>
              <dd>{formatGradeSummary(gradeSummary(records, "own_grade", gradeOrder))}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <span className="section-kicker">Ratings</span>
          </div>
          <dl className="rating-summary-list">
            <div>
              <dt>Average</dt>
              <dd>{average === null ? "-" : `${average.toFixed(1)}/5`}</dd>
            </div>
            <div>
              <dt>Rated</dt>
              <dd>
                {ratedCount}/{records.length}
              </dd>
            </div>
          </dl>
        </section>

        <section className="panel boulder-climbers-panel">
          <div className="panel-heading">
            <span className="section-kicker">Climbers</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Climber</th>
                  <th>Own grade</th>
                  <th>27Crags</th>
                  <th>Guide</th>
                  <th>Flash</th>
                  <th>Date</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => (
                  <tr key={`${record.climber}-${record.climbed_on}-${record.own_grade}`}>
                    <th>{record.climber || "-"}</th>
                    <td>{record.own_grade}</td>
                    <td>{record.grade_27crags}</td>
                    <td>{record.guide_grade}</td>
                    <td>{record.flash ? "Yes" : ""}</td>
                    <td>{record.climbed_on ?? ""}</td>
                    <td>
                      <RatingButtons
                        disabled={isSaving}
                        rating={record.rating}
                        onChange={(rating) => void updateRating(record, rating)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel boulder-comments-panel">
          <div className="panel-heading">
            <span className="section-kicker">Comments</span>
            <span className="comment-count">{comments.length}</span>
          </div>
          {isCommentsLoading ? (
            <div className="empty-detail-slot">Loading</div>
          ) : comments.length === 0 ? (
            <div className="empty-detail-slot">-</div>
          ) : (
            <ol className="comment-list">
              {comments.map((comment) => {
                const isEditing = editingCommentId === comment.id;
                return (
                  <li className="comment-item" key={comment.id}>
                    {isEditing ? (
                      <div className="comment-edit-form">
                        <label>
                          Climber
                          <input
                            required
                            value={editingClimber}
                            onChange={(event) => setEditingClimber(event.target.value)}
                          />
                        </label>
                        <label>
                          Comment
                          <textarea
                            required
                            rows={3}
                            value={editingBody}
                            onChange={(event) => setEditingBody(event.target.value)}
                          />
                        </label>
                        <div className="comment-actions">
                          <button
                            disabled={isCommentSaving}
                            type="button"
                            onClick={() => void saveEditingComment()}
                          >
                            Save
                          </button>
                          <button
                            disabled={isCommentSaving}
                            type="button"
                            onClick={cancelEditingComment}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="comment-meta">
                          <strong>{comment.climber}</strong>
                          <span>{formatCommentTime(comment.created_at)}</span>
                        </div>
                        <p>{comment.body}</p>
                        <div className="comment-actions">
                          <button
                            disabled={isCommentSaving}
                            type="button"
                            onClick={() => startEditingComment(comment)}
                          >
                            Edit
                          </button>
                          <button
                            className="danger-button"
                            disabled={isCommentSaving}
                            type="button"
                            onClick={() => void deleteComment(comment)}
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

          <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
            <label>
              Climber
              <input
                required
                list="comment-climbers"
                value={commentClimber}
                onChange={(event) => setCommentClimber(event.target.value)}
              />
            </label>
            <label>
              Comment
              <textarea
                required
                rows={3}
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
              />
            </label>
            <button disabled={isCommentSaving} type="submit">
              Post
            </button>
            <datalist id="comment-climbers">
              {climberOptions.map((climber) => (
                <option key={climber} value={climber} />
              ))}
            </datalist>
          </form>
        </section>
      </div>
    </section>
  );
}
