import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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

type AreaAxisTickProps = {
  x?: number;
  y?: number;
  payload?: {
    value?: string | number;
  };
};

const MAX_LABEL_LINE_LENGTH = 18;

function areaLabelLines(label: string): string[] {
  if (label.length <= MAX_LABEL_LINE_LENGTH) {
    return [label];
  }

  const preferredBreak = label.lastIndexOf(" ", MAX_LABEL_LINE_LENGTH);
  const splitAt = preferredBreak >= 8 ? preferredBreak : MAX_LABEL_LINE_LENGTH;
  const firstLine = label.slice(0, splitAt).trim();
  const remainder = label.slice(splitAt).trim();
  const secondLine =
    remainder.length > MAX_LABEL_LINE_LENGTH
      ? `${remainder.slice(0, MAX_LABEL_LINE_LENGTH - 1).trim()}…`
      : remainder;
  return [firstLine, secondLine];
}

function AreaAxisTick({ x = 0, y = 0, payload }: AreaAxisTickProps) {
  const area = String(payload?.value ?? "");
  const lines = areaLabelLines(area);

  return (
    <g transform={`translate(${x}, ${y})`}>
      <title>{area}</title>
      <text
        fill="var(--color-muted-strong)"
        fontSize={12}
        textAnchor="end"
        x={-9}
        y={lines.length === 1 ? 4 : -3}
      >
        {lines.map((line, index) => (
          <tspan dy={index === 0 ? 0 : 14} key={`${line}-${index}`} x={-9}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export default function AreaChart({ data, gradeSourceLabel }: AreaChartProps) {
  const chartData = data.slice(0, 12);
  const chartHeight = Math.max(260, chartData.length * 36);

  return (
    <section className={`${sharedStyles.panel} ${sharedStyles.chartPanel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Areas</span>
        <h2>{gradeSourceLabel} by area</h2>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 12, right: 34, left: 4, bottom: 0 }}
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
            interval={0}
            tick={<AreaAxisTick />}
            width={150}
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
          <Bar dataKey="count" fill="var(--color-chart-area)" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="count"
              fill="var(--color-body)"
              fontSize={12}
              position="right"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
