import { useMemo } from "react";

export type TimeGranularity = "day" | "week" | "month";

type Props = {
  minDate: string;
  maxDate: string;
  granularity: TimeGranularity;
  onGranularityChange: (g: TimeGranularity) => void;
  totalDays: number;
};

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function formatTick(date: Date, granularity: TimeGranularity): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (granularity === "month") {
    return date.toLocaleString("en", { month: "short", year: "2-digit" });
  }
  return `${m}/${d}`;
}

export function GanttHeader({
  minDate,
  maxDate,
  granularity,
  onGranularityChange,
  totalDays,
}: Props) {
  const ticks = useMemo(() => {
    const result: { label: string; pct: number }[] = [];
    const start = new Date(minDate);
    const cursor = new Date(start);

    // Align to granularity boundary
    if (granularity === "week") {
      cursor.setDate(cursor.getDate() - cursor.getDay());
    } else if (granularity === "month") {
      cursor.setDate(1);
    }

    while (cursor.toISOString().slice(0, 10) <= maxDate) {
      const offset = daysBetween(minDate, cursor.toISOString().slice(0, 10));
      const pct = totalDays > 0 ? (offset / totalDays) * 100 : 0;
      if (pct >= 0 && pct <= 100) {
        result.push({ label: formatTick(cursor, granularity), pct });
      }
      if (granularity === "day") cursor.setDate(cursor.getDate() + 1);
      else if (granularity === "week") cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }, [minDate, maxDate, granularity, totalDays]);

  // Today marker position
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOffset = daysBetween(minDate, todayStr);
  const todayPct = totalDays > 0 ? (todayOffset / totalDays) * 100 : -1;

  return (
    <div style={{ position: "relative" }}>
      {/* Zoom controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 8,
          justifyContent: "flex-end",
        }}
      >
        {(["day", "week", "month"] as TimeGranularity[]).map((g) => (
          <button
            key={g}
            onClick={() => onGranularityChange(g)}
            style={{
              padding: "2px 10px",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              background:
                granularity === g ? "var(--color-amber)" : "var(--bg-surface)",
              color:
                granularity === g
                  ? "var(--bg-primary)"
                  : "var(--text-muted)",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Time axis */}
      <div
        style={{
          position: "relative",
          height: 28,
          borderBottom: "1px solid var(--text-muted)",
        }}
      >
        {ticks.map((t, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${t.pct}%`,
              bottom: 0,
              fontSize: 10,
              color: "var(--text-muted)",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                width: 1,
                height: 6,
                background: "var(--text-muted)",
                margin: "0 auto 2px",
              }}
            />
            {t.label}
          </div>
        ))}

        {/* Today marker */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div
            style={{
              position: "absolute",
              left: `${todayPct}%`,
              top: 0,
              bottom: -4,
              width: 2,
              background: "var(--color-coral)",
              zIndex: 2,
            }}
            title="Today"
          />
        )}
      </div>
    </div>
  );
}
