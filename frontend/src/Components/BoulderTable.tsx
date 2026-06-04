import type { BoulderRecord } from "../Types/boulderTypes";

type BoulderTableProps = {
  records: BoulderRecord[];
};

export default function BoulderTable({ records }: BoulderTableProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <span className="section-kicker">Logbook</span>
        <h2>Recent climbs</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Area</th>
              <th>27Crags</th>
              <th>Guide</th>
              <th>My</th>
              <th>Flash</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {records
              .slice()
              .reverse()
              .slice(0, 24)
              .map((record) => (
                <tr key={`${record.name}-${record.area}-${record.climbed_on}`}>
                  <th>{record.name}</th>
                  <td>{record.area}</td>
                  <td>{record.grade_27crags}</td>
                  <td>{record.guide_grade}</td>
                  <td>{record.my_grade}</td>
                  <td>{record.flash ? "Yes" : ""}</td>
                  <td>{record.climbed_on ?? ""}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
