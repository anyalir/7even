import { useEffect, useState } from "react";
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

type VelocityWindow = {
  start: string;
  end: string;
  completedSp: number;
  taskCount: number;
  spPerPerson?: number;
};

type VelocityResponse = {
  windows: VelocityWindow[];
  teamSize: number;
  teamVelocity: number | null;
  initialVelocity: number | null;
};

type ChartRow = VelocityWindow & {
  label: string;
  rollingAvg: number;
  rollingAvgPerPerson: number;
};

type Props = {
  /** Compact mode for sidebar widget */
  compact?: boolean;
};

function computeEta(
  windows: VelocityWindow[],
  totalRemainingSp: number,
  teamSize: number,
  initialVelocity: number | null
) {
  const velocityPerWeek =
    windows.length > 0
      ? windows.slice(-3).reduce((s, w) => s + w.completedSp, 0) /
        Math.min(windows.length, 3)
      : initialVelocity;

  if (!velocityPerWeek || velocityPerWeek <= 0 || totalRemainingSp <= 0)
    return null;

  const daysNeeded = Math.ceil((totalRemainingSp / velocityPerWeek) * 7);
  const eta = new Date();
  eta.setDate(eta.getDate() + daysNeeded);
  return {
    date: eta.toISOString().slice(0, 10),
    confidence:
      windows.length >= 5
        ? "high"
        : windows.length >= 2
          ? "medium"
          : "low",
    daysNeeded,
    velocityPerWeek: Math.round(velocityPerWeek * 10) / 10,
    velocityPerPerson:
      Math.round((velocityPerWeek / teamSize) * 10) / 10,
    teamSize,
  };
}

export function VelocityChart({ compact }: Props) {
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [eta, setEta] = useState<{
    date: string;
    confidence: string;
    daysNeeded: number;
    velocityPerWeek: number;
    velocityPerPerson: number;
    teamSize: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/metrics/velocity").then(
        (r) => r.json() as Promise<VelocityResponse>
      ),
      fetch("/api/objectives").then(
        (r) =>
          r.json() as Promise<
            Array<{
              keyResults: Array<{
                tasks: Array<{
                  estimationHistory: Array<{ spRemaining: number }>;
                  status: string;
                }>;
              }>;
            }>
          >
      ),
    ])
      .then(([velData, objs]) => {
        const windows = velData.windows;
        const teamSize = velData.teamSize;

        // Compute rolling avg
        const chartRows: ChartRow[] = windows.map((w, i) => {
          const slice = windows.slice(Math.max(0, i - 2), i + 1);
          const avg =
            slice.reduce((s, x) => s + x.completedSp, 0) / slice.length;
          const avgPp =
            slice.reduce((s, x) => s + (x.spPerPerson ?? x.completedSp), 0) /
            slice.length;
          return {
            ...w,
            label: w.start.slice(5),
            rollingAvg: Math.round(avg * 10) / 10,
            rollingAvgPerPerson: Math.round(avgPp * 10) / 10,
          };
        });
        setRows(chartRows);

        // Compute remaining SP for ETA
        let remaining = 0;
        for (const obj of objs) {
          for (const kr of obj.keyResults) {
            for (const t of kr.tasks) {
              if (t.status !== "done" && t.estimationHistory.length > 0) {
                remaining +=
                  t.estimationHistory[t.estimationHistory.length - 1]
                    .spRemaining;
              }
            }
          }
        }
        setEta(
          computeEta(windows, remaining, teamSize, velData.initialVelocity)
        );
      })
      .catch(() => {});
  }, []);

  if (compact) {
    return (
      <div style={{ fontSize: 11, textTransform: "uppercase" }}>
        <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>
          VELOCITY
        </div>
        {rows.length > 0 ? (
          <>
            <div>
              {rows[rows.length - 1].completedSp} SP /{" "}
              {rows[rows.length - 1].taskCount} TASKS
            </div>
            {eta && (
              <>
                <div style={{ marginTop: 4, fontSize: 10 }}>
                  ETA: {eta.date}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
                  {eta.velocityPerWeek} SP/WK ({eta.teamSize} PEOPLE)
                </div>
              </>
            )}
          </>
        ) : (
          <div>NO DATA</div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* ETA + velocity annotation */}
      {eta && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            fontSize: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>Est. completion:</span>
          <span style={{ fontWeight: 600 }}>{eta.date}</span>
          <span
            style={{
              background:
                eta.confidence === "high"
                  ? "var(--color-sage)"
                  : eta.confidence === "medium"
                    ? "var(--color-amber)"
                    : "var(--color-coral)",
              color: "var(--bg-primary)",
              padding: "1px 6px",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {eta.confidence}
          </span>
          <span
            style={{ color: "var(--text-muted)", fontSize: 10, marginLeft: 4 }}
          >
            ({eta.daysNeeded}d remaining)
          </span>
          <span
            style={{
              color: "var(--text-muted)",
              fontSize: 10,
              marginLeft: 8,
              borderLeft: "1px solid var(--border-subtle)",
              paddingLeft: 8,
            }}
          >
            {eta.velocityPerWeek} SP/wk · {eta.velocityPerPerson} SP/person/wk
            · {eta.teamSize} {eta.teamSize === 1 ? "person" : "people"}
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <div
          style={{
            color: "var(--text-muted)",
            padding: 24,
            textAlign: "center",
          }}
        >
          No velocity data available
          {eta && (
            <div style={{ marginTop: 8, fontSize: 11 }}>
              Using initial velocity estimate for forecasting
            </div>
          )}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={rows}>
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-subtle)" }}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-subtle)" }}
              label={{
                value: "Story Points",
                angle: -90,
                position: "insideLeft",
                fill: "var(--text-muted)",
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: 12,
              }}
              formatter={(v: number, name: string) => {
                if (name === "rollingAvg") return [`${v} SP (team avg)`, "Rolling Avg"];
                if (name === "rollingAvgPerPerson")
                  return [`${v} SP (per person avg)`, "Per Person"];
                return [`${v} SP`, "Completed"];
              }}
              labelFormatter={(l) => `Window: ${l}`}
            />
            <Bar
              dataKey="completedSp"
              fill="var(--color-sage)"
              fillOpacity={0.8}
            />
            <Line
              type="monotone"
              dataKey="rollingAvg"
              stroke="var(--color-amber)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="rollingAvgPerPerson"
              stroke="var(--color-lavender)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
