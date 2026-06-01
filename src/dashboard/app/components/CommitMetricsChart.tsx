import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type CommitEntry = {
  hash: string;
  date: string;
  message: string;
  taskId: string;
  taskName: string;
};

type FreqRow = {
  date: string;
  count: number;
};

type Props = {
  /** Filter to a specific task, KR, or show all */
  taskId?: string;
};

export function CommitMetricsChart({ taskId }: Props) {
  const [freqData, setFreqData] = useState<FreqRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = taskId
      ? `/api/metrics/commits/${taskId}`
      : "/api/metrics/commits";

    fetch(url)
      .then((r) => r.json())
      .then((commits: CommitEntry[]) => {
        // Group by date for frequency chart
        const dateMap = new Map<string, number>();
        for (const c of commits) {
          const d = c.date.slice(0, 10);
          dateMap.set(d, (dateMap.get(d) ?? 0) + 1);
        }
        const freq = [...dateMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count }));

        setFreqData(freq);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [taskId]);

  if (loading) {
    return (
      <div style={{ color: "var(--text-muted)", padding: 24 }}>Loading…</div>
    );
  }

  if (freqData.length === 0) {
    return (
      <div
        style={{
          color: "var(--text-muted)",
          padding: 24,
          textAlign: "center",
        }}
      >
        No commit data available
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Commit frequency */}
      <div>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 8,
            letterSpacing: "0.05em",
          }}
        >
          Commit Frequency
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={freqData}>
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-subtle)" }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-subtle)" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: 12,
              }}
              formatter={(v) => [`${v} commits`, "Commits"]}
            />
            <Bar
              dataKey="count"
              fill="var(--color-lavender)"
              fillOpacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
