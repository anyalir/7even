import { useEffect, useState } from "react";
import {
  BarChart,
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
};

type ChartRow = VelocityWindow & {
  label: string;
  rollingAvg: number;
};

type Props = {
  /** Compact mode for sidebar widget */
  compact?: boolean;
};

function computeEta(windows: VelocityWindow[], totalRemainingSp: number) {
  if (windows.length === 0 || totalRemainingSp <= 0) return null;
  const avgSp =
    windows.reduce((s, w) => s + w.completedSp, 0) / windows.length;
  if (avgSp <= 0) return null;
  const windowsNeeded = totalRemainingSp / avgSp;
  // Assume 7-day windows
  const daysNeeded = Math.ceil(windowsNeeded * 7);
  const eta = new Date();
  eta.setDate(eta.getDate() + daysNeeded);
  return {
    date: eta.toISOString().slice(0, 10),
    confidence: windows.length >= 3 ? "high" : "low",
    daysNeeded,
  };
}

export function VelocityChart({ compact }: Props) {
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [eta, setEta] = useState<{
    date: string;
    confidence: string;
    daysNeeded: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/metrics/velocity").then(
        (r) => r.json() as Promise<VelocityWindow[]>
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
      .then(([windows, objs]) => {
        // Compute rolling avg
        const chartRows: ChartRow[] = windows.map((w, i) => {
          const slice = windows.slice(Math.max(0, i - 2), i + 1);
          const avg =
            slice.reduce((s, x) => s + x.completedSp, 0) / slice.length;
          return {
            ...w,
            label: w.start.slice(5),
            rollingAvg: Math.round(avg * 10) / 10,
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
        setEta(computeEta(windows, remaining));
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
              <div style={{ marginTop: 4, fontSize: 10 }}>
                ETA: {eta.date}
              </div>
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
      {/* ETA annotation */}
      {eta && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>Est. completion:</span>
          <span style={{ fontWeight: 600 }}>{eta.date}</span>
          <span
            style={{
              background:
                eta.confidence === "high"
                  ? "var(--color-sage)"
                  : "var(--color-amber)",
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
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={rows}>
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--text-muted)" }}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--text-muted)" }}
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
                border: "1px solid var(--text-muted)",
                color: "var(--text-primary)",
                fontSize: 12,
              }}
              formatter={(v, name) => [
                name === "rollingAvg" ? `${v} SP (avg)` : `${v} SP`,
                name === "rollingAvg" ? "Rolling Avg" : "Completed",
              ]}
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
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
