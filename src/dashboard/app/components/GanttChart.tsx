import { useEffect, useState, useMemo } from "react";
import { GanttHeader, type TimeGranularity } from "./GanttHeader.js";
import { GanttBar } from "./GanttBar.js";

type GanttBarData = {
  id: string;
  type: string;
  name: string;
  start: string;
  end: string;
  parentId?: string;
  progress: number;
};

// Deterministic color from objective id
const OBJ_COLORS = [
  "var(--color-coral)",
  "var(--color-amber)",
  "var(--color-sage)",
  "var(--color-blue)",
  "var(--color-lavender)",
  "var(--color-rose)",
];

function hashToIndex(id: string, len: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % len;
}

function deriveKrColor(objColor: string): string {
  // Lighter shade via opacity
  return objColor;
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

type RowItem = GanttBarData & {
  depth: number;
  color: string;
  objectiveId: string;
  childIds?: string[];
};

type GanttChartProps = {
  onKrClick?: (krId: string) => void;
  activeBurndownKrId?: string | null;
};

export function GanttChart({ onKrClick, activeBurndownKrId }: GanttChartProps = {}) {
  const [bars, setBars] = useState<GanttBarData[]>([]);
  const [granularity, setGranularity] = useState<TimeGranularity>("week");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/metrics/gantt")
      .then((r) => r.json())
      .then((data: GanttBarData[]) => setBars(data))
      .catch(() => {});
  }, []);

  // Build tree: objectives → KRs → tasks
  const { rows, minDate, maxDate, totalDays } = useMemo(() => {
    if (bars.length === 0)
      return { rows: [] as RowItem[], minDate: "", maxDate: "", totalDays: 1 };

    const objectives = bars.filter((b) => b.type === "objective");
    const krs = bars.filter((b) => b.type === "key-result");
    const tasks = bars.filter((b) => b.type === "task");

    // Build color map
    const objColorMap = new Map<string, string>();
    objectives.forEach((o) => {
      objColorMap.set(o.id, OBJ_COLORS[hashToIndex(o.id, OBJ_COLORS.length)]);
    });

    const result: RowItem[] = [];
    for (const obj of objectives) {
      const objColor = objColorMap.get(obj.id) ?? OBJ_COLORS[0];
      const childKrs = krs.filter((kr) => kr.parentId === obj.id);
      result.push({
        ...obj,
        depth: 0,
        color: objColor,
        objectiveId: obj.id,
        childIds: childKrs.map((kr) => kr.id),
      });

      if (!collapsed.has(obj.id)) {
        for (const kr of childKrs) {
          const childTasks = tasks.filter((t) => t.parentId === kr.id);
          result.push({
            ...kr,
            depth: 1,
            color: deriveKrColor(objColor),
            objectiveId: obj.id,
            childIds: childTasks.map((t) => t.id),
          });

          if (!collapsed.has(kr.id)) {
            for (const task of childTasks) {
              result.push({
                ...task,
                depth: 2,
                color: objColor,
                objectiveId: obj.id,
              });
            }
          }
        }
      }
    }

    // Orphaned KRs/tasks (no parent found)
    const placedIds = new Set(result.map((r) => r.id));
    for (const kr of krs) {
      if (!placedIds.has(kr.id)) {
        result.push({ ...kr, depth: 0, color: OBJ_COLORS[0], objectiveId: kr.id });
      }
    }
    for (const task of tasks) {
      if (!placedIds.has(task.id)) {
        result.push({ ...task, depth: 0, color: OBJ_COLORS[0], objectiveId: task.id });
      }
    }

    const allDates = bars.flatMap((b) => [b.start, b.end]).sort();
    const mn = allDates[0];
    const mx = allDates[allDates.length - 1];
    // Add padding
    const padStart = new Date(mn);
    padStart.setDate(padStart.getDate() - 3);
    const padEnd = new Date(mx);
    padEnd.setDate(padEnd.getDate() + 7);
    const mnStr = padStart.toISOString().slice(0, 10);
    const mxStr = padEnd.toISOString().slice(0, 10);

    return {
      rows: result,
      minDate: mnStr,
      maxDate: mxStr,
      totalDays: daysBetween(mnStr, mxStr) || 1,
    };
  }, [bars, collapsed]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (bars.length === 0) {
    return (
      <div className="lcars-card" style={{ padding: 24 }}>
        <p style={{ color: "var(--text-muted)" }}>
          No timeline data yet. Create objectives and tasks to see the Gantt
          chart.
        </p>
      </div>
    );
  }

  const ROW_H: Record<string, number> = {
    objective: 44,
    "key-result": 36,
    task: 30,
  };

  return (
    <div>
      <GanttHeader
        minDate={minDate}
        maxDate={maxDate}
        granularity={granularity}
        onGranularityChange={setGranularity}
        totalDays={totalDays}
      />

      {/* Rows */}
      <div style={{ marginTop: 4 }}>
        {rows.map((row, i) => {
          const startPct =
            (daysBetween(minDate, row.start) / totalDays) * 100;
          const endPct = (daysBetween(minDate, row.end) / totalDays) * 100;
          const widthPct = endPct - startPct;
          const rowH = ROW_H[row.type] ?? 36;
          const canExpand =
            row.type === "objective" || row.type === "key-result";
          const isCollapsed = collapsed.has(row.id);

          // LCARS decorative bar between objective groups
          const showSep =
            row.type === "objective" && i > 0;

          return (
            <div key={row.id}>
              {showSep && (
                <div
                  style={{
                    height: "var(--bar-width)",
                    background: "var(--text-muted)",
                    opacity: 0.3,
                    margin: "2px 0",
                  }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  height: rowH,
                  alignItems: "center",
                  borderBottom: "1px solid rgba(138,130,120,0.15)",
                  background:
                    row.type === "key-result" && activeBurndownKrId === row.id
                      ? "rgba(138,130,120,0.1)"
                      : undefined,
                }}
              >
                {/* Label column */}
                <div
                  style={{
                    width: 220,
                    minWidth: 220,
                    paddingLeft: 8 + row.depth * 20,
                    fontSize: row.type === "objective" ? 13 : 12,
                    fontWeight: row.type === "objective" ? 700 : 400,
                    color:
                      row.type === "task"
                        ? "var(--text-muted)"
                        : "var(--text-primary)",
                    textTransform:
                      row.type === "objective" ? "uppercase" : undefined,
                    letterSpacing:
                      row.type === "objective" ? "0.04em" : undefined,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: canExpand ? "pointer" : "default",
                    userSelect: "none",
                  }}
                  onClick={() => {
                    if (row.type === "key-result" && onKrClick) {
                      onKrClick(row.id);
                    } else if (canExpand) {
                      toggleCollapse(row.id);
                    }
                  }}
                  title={row.name}
                >
                  {canExpand && (
                    <span style={{ marginRight: 6, fontSize: 10 }}>
                      {isCollapsed ? "▸" : "▾"}
                    </span>
                  )}
                  {row.name}
                </div>

                {/* Bar area */}
                <div
                  style={{
                    flex: 1,
                    position: "relative",
                    height: "100%",
                  }}
                >
                  <GanttBar
                    name={row.name}
                    type={row.type}
                    startPct={startPct}
                    widthPct={widthPct}
                    color={row.color}
                    progress={row.progress}
                    startDate={row.start}
                    endDate={row.end}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
