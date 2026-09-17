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
import sharedStyles from "../Styles/Shared.module.css";
import styles from "./GradeChart.module.css";

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

function seriesTotal(data: GradeCount[]): number {
  return data.reduce((total, entry) => total + entry.count, 0);
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
      <div className={styles.legend} aria-label="Grade source legend">
        {series.map((entry) => (
          <span className={styles.legendItem} key={entry.key}>
            <i aria-hidden="true" style={{ backgroundColor: entry.color }} />
            <strong>{entry.label}</strong>
            <span>{seriesTotal(entry.data)}</span>
          </span>
        ))}
      </div>
      {chartData.length === 0 ? (
        <div className={sharedStyles.emptyDetailSlot}>No grade data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            barCategoryGap="28%"
            barGap={2}
            margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
            <XAxis
              dataKey="grade"
              tick={{ fill: "var(--color-muted-strong)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
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
            {series.map((entry) => (
              <Bar
                dataKey={entry.key}
                fill={entry.color}
                key={entry.key}
                maxBarSize={30}
                name={entry.label}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
