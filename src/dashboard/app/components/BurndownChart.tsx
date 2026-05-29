import { useEffect, useState, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

type BurndownPoint = {
  date: string;
  remaining: number;
  ideal: number;
};

type KrOption = { id: string; name: string };

type Props = {
  /** Pre-selected KR id. When set, the internal selector is hidden. */
  krId?: string;
  /** Pre-selected objective id for aggregate view. */
  objectiveId?: string;
};

export function BurndownChart({ krId, objectiveId }: Props) {
  const [data, setData] = useState<BurndownPoint[]>([]);
  const [krs, setKrs] = useState<KrOption[]>([]);
  const [selectedKr, setSelectedKr] = useState<string>(krId ?? "");
  const [mode, setMode] = useState<"kr" | "objective">(
    objectiveId ? "objective" : "kr"
  );

  // Brush zoom state
  const [refLeft, setRefLeft] = useState<string | null>(null);
  const [refRight, setRefRight] = useState<string | null>(null);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Load KR options
  useEffect(() => {
    fetch("/api/objectives")
      .then((r) => r.json())
      .then(
        (
          objs: Array<{
            id: string;
            name: string;
            keyResults: Array<{ id: string; name: string }>;
          }>
        ) => {
          const allKrs: KrOption[] = [];
          for (const obj of objs) {
            for (const kr of obj.keyResults) {
              allKrs.push({ id: kr.id, name: kr.name });
            }
          }
          setKrs(allKrs);
          if (!selectedKr && allKrs.length > 0) {
            setSelectedKr(allKrs[0].id);
          }
        }
      )
      .catch(() => {});
  }, []);

  // Fetch burndown data
  const fetchBurndown = useCallback(async () => {
    if (mode === "kr" && selectedKr) {
      const res = await fetch(`/api/metrics/burndown/${selectedKr}`);
      const pts: BurndownPoint[] = await res.json();
      setData(pts);
      setZoomDomain(null);
    } else if (mode === "objective") {
      // Aggregate: fetch all KR burndowns and merge
      const promises = krs.map((kr) =>
        fetch(`/api/metrics/burndown/${kr.id}`).then(
          (r) => r.json() as Promise<BurndownPoint[]>
        )
      );
      const results = await Promise.all(promises);
      // Merge by date
      const map = new Map<string, BurndownPoint>();
      for (const pts of results) {
        for (const p of pts) {
          const existing = map.get(p.date);
          if (existing) {
            existing.remaining += p.remaining;
            existing.ideal += p.ideal;
          } else {
            map.set(p.date, { ...p });
          }
        }
      }
      const merged = [...map.values()].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      setData(merged);
      setZoomDomain(null);
    }
  }, [mode, selectedKr, krs]);

  useEffect(() => {
    fetchBurndown().catch(() => {});
  }, [fetchBurndown]);

  const displayData =
    zoomDomain !== null ? data.slice(zoomDomain[0], zoomDomain[1] + 1) : data;

  const handleMouseDown = (e: { activeLabel?: string }) => {
    if (e?.activeLabel) setRefLeft(e.activeLabel);
  };

  const handleMouseMove = (e: { activeLabel?: string }) => {
    if (refLeft && e?.activeLabel) setRefRight(e.activeLabel);
  };

  const handleMouseUp = () => {
    if (refLeft && refRight) {
      const li = data.findIndex((d) => d.date === refLeft);
      const ri = data.findIndex((d) => d.date === refRight);
      if (li >= 0 && ri >= 0) {
        setZoomDomain([Math.min(li, ri), Math.max(li, ri)]);
      }
    }
    setRefLeft(null);
    setRefRight(null);
  };

  const resetZoom = () => setZoomDomain(null);

  return (
    <div ref={chartRef}>
      {/* Controls */}
      {!krId && !objectiveId && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 12,
            alignItems: "center",
          }}
        >
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "kr" | "objective")}
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--text-muted)",
              padding: "4px 8px",
              fontSize: 12,
              textTransform: "uppercase",
            }}
          >
            <option value="kr">Per KR</option>
            <option value="objective">Per Objective</option>
          </select>

          {mode === "kr" && (
            <select
              value={selectedKr}
              onChange={(e) => setSelectedKr(e.target.value)}
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--text-muted)",
                padding: "4px 8px",
                fontSize: 12,
                flex: 1,
                maxWidth: 300,
              }}
            >
              {krs.map((kr) => (
                <option key={kr.id} value={kr.id}>
                  {kr.name}
                </option>
              ))}
            </select>
          )}

          {zoomDomain && (
            <button
              onClick={resetZoom}
              style={{
                background: "var(--color-coral)",
                color: "var(--bg-primary)",
                border: "none",
                padding: "4px 12px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              RESET ZOOM
            </button>
          )}
        </div>
      )}

      {data.length === 0 ? (
        <div
          style={{
            color: "var(--text-muted)",
            padding: 24,
            textAlign: "center",
          }}
        >
          No burndown data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={displayData}
            onMouseDown={handleMouseDown as never}
            onMouseMove={handleMouseMove as never}
            onMouseUp={handleMouseUp}
          >
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--text-muted)" }}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--text-muted)" }}
              label={{
                value: "SP Remaining",
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
            labelFormatter={(l) => `Date: ${l}`}
            formatter={(v, name) => [
              `${v} SP`,
              name === "ideal" ? "Ideal" : "Actual",
            ]}
            />
            <Area
              type="monotone"
              dataKey="ideal"
              stroke="var(--color-blue)"
              fill="none"
              strokeDasharray="5 3"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="remaining"
              stroke="var(--color-coral)"
              fill="var(--color-coral)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            {refLeft && refRight && (
              <ReferenceArea
                x1={refLeft}
                x2={refRight}
                strokeOpacity={0.3}
                fill="var(--color-amber)"
                fillOpacity={0.2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
