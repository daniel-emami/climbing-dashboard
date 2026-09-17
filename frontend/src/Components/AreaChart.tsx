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
import sharedStyles from "../Styles/Shared.module.css";

type AreaChartProps = {
  data: AreaCount[];
  gradeSourceLabel: string;
};

export default function AreaChart({ data }: AreaChartProps) {
  return (
    <section className={`${sharedStyles.panel} ${sharedStyles.chartPanel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Areas</span>
        <h2>Areas by grade</h2>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data.slice(0, 12)}
          layout="vertical"
          margin={{ top: 12, right: 18, left: 42, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--color-chart-grid)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "var(--color-muted)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="area"
            width={78}
            tick={{ fill: "var(--color-muted)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-subtle)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-control)",
              color: "var(--color-text)"
            }}
            cursor={{ fill: "var(--color-chart-hover)" }}
            labelStyle={{ color: "var(--color-heading)" }}
          />
          <Bar dataKey="count" fill="var(--color-chart-area)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
