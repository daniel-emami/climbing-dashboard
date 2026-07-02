import type { BoulderPageIdentity, BoulderRecord } from "../Types/boulderTypes";

type BoulderDetailPageProps = {
  identity: BoulderPageIdentity;
  gradeOrder: string[];
  records: BoulderRecord[];
  onBack: () => void;
};

type GradeSummary = {
  grade: string;
  count: number;
};

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

export default function BoulderDetailPage({
  identity,
  gradeOrder,
  records,
  onBack
}: BoulderDetailPageProps) {
  const sortedRecords = records
    .slice()
    .sort((left, right) => compareDates(right.climbed_on, left.climbed_on));
  const flashCount = records.filter((record) => record.flash).length;
  const climberCount = new Set(records.map((record) => record.climber).filter(Boolean)).size;
  const latest = latestDate(records);

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
          <div className="empty-detail-slot">-</div>
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
                    <td>-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel boulder-comments-panel">
          <div className="panel-heading">
            <span className="section-kicker">Comments</span>
          </div>
          <div className="empty-detail-slot">-</div>
        </section>
      </div>
    </section>
  );
}
