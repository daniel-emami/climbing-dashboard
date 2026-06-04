import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { GradeCount } from "../Types/boulderTypes";

type GradeChartProps = {
  title: string;
  data: GradeCount[];
};

export default function GradeChart({ title, data }: GradeChartProps) {
  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <span className="section-kicker">Grades</span>
        <h2>{title}</h2>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="grade" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "#eef6f5" }} />
          <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
