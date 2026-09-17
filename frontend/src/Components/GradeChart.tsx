import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { GradeCount } from "../Types/boulderTypes";
import sharedStyles from "../Styles/Shared.module.css";

export type GradeChartSeries = {
  key: string;
  label: string;
  color: string;
  data: GradeCount[];
};

type GradeChartProps = {
  title: string;
  gradeOrder: string[];
  series: GradeChartSeries[];
};

function countByGrade(data: GradeCount[]): Map<string, number> {
  return new Map(data.map((entry) => [entry.grade, entry.count]));
}

export default function GradeChart({ title, gradeOrder, series }: GradeChartProps) {
  const seriesMaps = series.map((entry) => ({
    ...entry,
    counts: countByGrade(entry.data)
  }));
  const chartData = gradeOrder
    .map((grade) => {
      const row: Record<string, number | string> = { grade };
      for (const entry of seriesMaps) {
        row[entry.key] = entry.counts.get(grade) ?? 0;
      }
      return row;
    })
    .filter((row) => seriesMaps.some((entry) => Number(row[entry.key]) > 0));

  return (
    <section className={`${sharedStyles.panel} ${sharedStyles.chartPanel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Grades</span>
        <h2>{title}</h2>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} barCategoryGap="22%" margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
          <XAxis
            dataKey="grade"
            tick={{ fill: "var(--color-muted)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
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
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: "0.76rem", paddingTop: 8 }} />}
          {series.map((entry) => (
            <Bar
              dataKey={entry.key}
              fill={entry.color}
              key={entry.key}
              name={entry.label}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
