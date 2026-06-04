type AreaGradeMatrixProps = {
  rows: Array<Record<string, number | string>>;
  grades: string[];
  gradeSourceLabel: string;
};

export default function AreaGradeMatrix({
  rows,
  grades,
  gradeSourceLabel
}: AreaGradeMatrixProps) {
  const visibleGrades = grades.filter((grade) =>
    rows.some((row) => Number(row[grade] ?? 0) > 0)
  );

  return (
    <section className="panel matrix-panel">
      <div className="panel-heading">
        <span className="section-kicker">Map</span>
        <h2>Areas by {gradeSourceLabel.toLowerCase()}</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Area</th>
              {visibleGrades.map((grade) => (
                <th key={grade}>{grade}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.area)}>
                <th>{row.area}</th>
                {visibleGrades.map((grade) => (
                  <td key={grade}>{Number(row[grade] ?? 0) || ""}</td>
                ))}
                <td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
