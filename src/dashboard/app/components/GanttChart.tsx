import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { GanttHeader, type TimeGranularity } from "./GanttHeader.js";
import { GanttBar } from "./GanttBar.js";

type GanttBarData = {
  id: string;
  type: string;
  name: string;
  shortId?: string;
  start: string;
  end: string;
  parentId?: string;
  progress: number;
  dependsOn?: string[];
  isForecast?: boolean;
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
  shortId?: string;
  childIds?: string[];
  isForecast?: boolean;
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
    objectives.forEach((o, i) => {
      objColorMap.set(o.id, OBJ_COLORS[i % OBJ_COLORS.length]);
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

    // Orphaned KRs/tasks (no known parent in data — NOT collapsed items)
    const knownObjIds = new Set(objectives.map((o) => o.id));
    const knownKrIds = new Set(krs.map((kr) => kr.id));
    const placedIds = new Set(result.map((r) => r.id));
    for (const kr of krs) {
      if (!placedIds.has(kr.id) && !knownObjIds.has(kr.parentId ?? "")) {
        result.push({ ...kr, depth: 0, color: OBJ_COLORS[0], objectiveId: kr.id });
      }
    }
    for (const task of tasks) {
      if (!placedIds.has(task.id) && !knownKrIds.has(task.parentId ?? "")) {
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

  const rowsRef = useRef<HTMLDivElement>(null);

  const ROW_H: Record<string, number> = {
    objective: 44,
    "key-result": 36,
    task: 30,
  };

  // Dependency arrows: measure actual DOM positions after render
  const [depPaths, setDepPaths] = useState<string[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const container = rowsRef.current;
    if (!container) return;

    // Find all row elements with data-row-id
    const rowEls = container.querySelectorAll<HTMLElement>("[data-row-id]");
    const barAreaEls = container.querySelectorAll<HTMLElement>("[data-bar-area]");
    if (rowEls.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const rowRects = new Map<string, { y: number; barLeft: number; barWidth: number }>();

    rowEls.forEach((el, i) => {
      const id = el.getAttribute("data-row-id")!;
      const rect = el.getBoundingClientRect();
      const barEl = el.querySelector<HTMLElement>("[data-bar-area]");
      const barRect = barEl?.getBoundingClientRect();
      rowRects.set(id, {
        y: rect.top - containerRect.top + rect.height / 2,
        barLeft: barRect ? barRect.left - containerRect.left : 0,
        barWidth: barRect ? barRect.width : 0,
      });
    });

    // Get bar area offset (same for all rows)
    const firstBarArea = container.querySelector<HTMLElement>("[data-bar-area]");
    if (!firstBarArea) return;
    const barAreaRect = firstBarArea.getBoundingClientRect();
    const barAreaLeft = barAreaRect.left - containerRect.left;
    const barAreaWidth = barAreaRect.width;

    const paths: string[] = [];
    for (const row of rows) {
      const deps = (row as any).dependsOn as string[] | undefined;
      if (!deps?.length) continue;
      const toInfo = rowRects.get(row.id);
      if (!toInfo) continue;
      const toStartPct = daysBetween(minDate, row.start) / totalDays;
      const toX = barAreaLeft + toStartPct * barAreaWidth;

      for (const depId of deps) {
        const fromInfo = rowRects.get(depId);
        if (!fromInfo) continue;
        const fromRow = rows.find((r) => r.id === depId);
        if (!fromRow) continue;
        const fromEndPct = daysBetween(minDate, fromRow.end) / totalDays;
        const fromX = barAreaLeft + fromEndPct * barAreaWidth;
        const midX = (fromX + toX) / 2;

        paths.push(
          `M ${fromX} ${fromInfo.y} L ${midX} ${fromInfo.y} L ${midX} ${toInfo.y} L ${toX} ${toInfo.y}`
        );
      }
    }

    setSvgSize({ w: containerRect.width, h: containerRect.height });
    setDepPaths(paths);
  }, [rows, minDate, totalDays]);

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
      <div style={{ marginTop: 4, position: "relative" }} ref={rowsRef}>
        {/* Dependency arrows SVG overlay */}
        {depPaths.length > 0 && (
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: svgSize.w,
              height: svgSize.h,
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <defs>
              <marker
                id="dep-arrow"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" />
              </marker>
            </defs>
            {depPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.6}
                markerEnd="url(#dep-arrow)"
              />
            ))}
          </svg>
        )}
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
                    background: "var(--border-subtle)",
                    opacity: 0.3,
                    margin: "2px 0",
                  }}
                />
              )}
              <div
                data-row-id={row.id}
                style={{
                  display: "flex",
                  minHeight: rowH,
                  alignItems: "center",
                  padding: "4px 0",
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
                    width: 340,
                    minWidth: 340,
                    paddingLeft: 8 + row.depth * 20,
                    paddingRight: 8,
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
                    whiteSpace: "normal",
                    lineHeight: 1.4,
                    cursor: canExpand ? "pointer" : "default",
                    userSelect: "none",
                  }}
                  onClick={() => {
                    if (canExpand) {
                      toggleCollapse(row.id);
                    }
                    if (row.type === "key-result" && onKrClick) {
                      onKrClick(row.id);
                    }
                  }}
                  title={row.shortId ? `${row.shortId} — ${row.name}` : row.name}
                >
                  {canExpand && (
                    <span style={{ marginRight: 6, fontSize: 10 }}>
                      {isCollapsed ? "▸" : "▾"}
                    </span>
                  )}
                  {row.shortId && <span style={{ fontWeight: 700, opacity: 0.6, marginRight: 4, fontSize: 10 }}>{row.shortId}</span>}
                  {(row as any).summary || row.name}
                </div>

                {/* Bar area */}
                <div
                  data-bar-area
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
                    isForecast={row.isForecast}
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
