import type {
  BoulderComment,
  BoulderCommentUpdateRequest,
  BoulderCreateRequest,
  BoulderIdentity,
  BoulderMedia,
  BoulderMediaUploadRequest,
  BoulderPageIdentity,
  BoulderRecord
} from "../Types/boulderTypes";
import sharedStyles from "../Styles/Shared.module.css";
import BoulderAscentsPanel from "./BoulderAscentsPanel";
import BoulderCommentsPanel from "./BoulderCommentsPanel";
import styles from "./BoulderDetailPage.module.css";
import BoulderMediaPanel from "./BoulderMediaPanel";

type BoulderDetailPageProps = {
  identity: BoulderPageIdentity;
  gradeOrder: string[];
  comments: BoulderComment[];
  isSaving: boolean;
  isCommentsLoading: boolean;
  isCommentSaving: boolean;
  currentUserId: number | null;
  currentUsername: string | null;
  isMediaLoading: boolean;
  isMediaSaving: boolean;
  media: BoulderMedia[];
  records: BoulderRecord[];
  onAddComment: (body: string) => Promise<void>;
  onBack: () => void;
  onDeleteComment: (commentId: number) => Promise<void>;
  onDeleteMedia: (mediaId: number) => Promise<void>;
  onOpenBoulderer: (username: string) => void;
  onUploadVideo: (
    request: Omit<BoulderMediaUploadRequest, "name" | "area" | "sector">
  ) => Promise<void>;
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

function averageRating(records: BoulderRecord[]): number | null {
  const ratings = records
    .map((record) => record.rating)
    .filter((rating): rating is number => rating !== null);
  if (ratings.length === 0) {
    return null;
  }
  return ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
}

export default function BoulderDetailPage({
  identity,
  gradeOrder,
  comments,
  isSaving,
  isCommentsLoading,
  isCommentSaving,
  currentUserId,
  currentUsername,
  isMediaLoading,
  isMediaSaving,
  media,
  records,
  onAddComment,
  onBack,
  onDeleteComment,
  onDeleteMedia,
  onOpenBoulderer,
  onUploadVideo,
  onUpdateComment,
  onUpdate
}: BoulderDetailPageProps) {
  const flashCount = records.filter((record) => record.flash).length;
  const climberCount = new Set(records.map((record) => record.climber).filter(Boolean)).size;
  const latest = latestDate(records);
  const average = averageRating(records);
  const ratedCount = records.filter((record) => record.rating !== null).length;
  const locationLabel = identity.sector
    ? `${identity.area} / ${identity.sector}`
    : identity.area;
  const hasCurrentUserAscent = records.some(
    (record) =>
      currentUsername !== null &&
      record.climber.toLocaleLowerCase() === currentUsername.toLocaleLowerCase()
  );

  return (
    <section className={styles.page} aria-label="Boulder details">
      <button className={sharedStyles.backButton} type="button" onClick={onBack}>
        Back
      </button>

      <section className={`${sharedStyles.panel} ${styles.hero}`}>
        <div>
          <span className={sharedStyles.sectionKicker}>Boulder</span>
          <h2>{identity.name}</h2>
          <p>{locationLabel}</p>
        </div>
        <dl className={styles.stats} aria-label="Boulder summary">
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

      <div className={styles.grid}>
        <section className={sharedStyles.panel}>
          <div className={sharedStyles.panelHeading}>
            <span className={sharedStyles.sectionKicker}>Grades</span>
          </div>
          <dl className={styles.gradeList}>
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

        <section className={sharedStyles.panel}>
          <div className={sharedStyles.panelHeading}>
            <span className={sharedStyles.sectionKicker}>Ratings</span>
          </div>
          <dl className={styles.ratingSummary}>
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

        <BoulderMediaPanel
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          hasCurrentUserAscent={hasCurrentUserAscent}
          isLoading={isMediaLoading}
          isSaving={isMediaSaving}
          media={media}
          onDeleteMedia={onDeleteMedia}
          onUploadVideo={onUploadVideo}
        />

        <BoulderAscentsPanel
          currentUsername={currentUsername}
          isSaving={isSaving}
          records={records}
          onOpenBoulderer={onOpenBoulderer}
          onUpdate={onUpdate}
        />

        <BoulderCommentsPanel
          comments={comments}
          currentUsername={currentUsername}
          isLoading={isCommentsLoading}
          isSaving={isCommentSaving}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onUpdateComment={onUpdateComment}
        />
      </div>
    </section>
  );
}
