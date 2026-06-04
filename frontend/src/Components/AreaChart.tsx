import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { AreaCount } from "../Types/boulderTypes";

type AreaChartProps = {
  data: AreaCount[];
  gradeSourceLabel: string;
};

export default function AreaChart({ data }: AreaChartProps) {
  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <span className="section-kicker">Areas</span>
        <h2>Areas by grade</h2>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data.slice(0, 12)}
          layout="vertical"
          margin={{ top: 12, right: 18, left: 42, bottom: 0 }}
        >
          <CartesianGrid stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="area" width={78} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "#eef6f5" }} />
          <Bar dataKey="count" fill="#da6969" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
