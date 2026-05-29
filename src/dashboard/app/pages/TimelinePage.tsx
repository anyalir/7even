import { useState, useCallback } from "react";
import { GanttChart } from "../components/GanttChart.js";

type BurndownPoint = { date: string; spRemaining: number };

export function TimelinePage() {
  const [burndownKrId, setBurndownKrId] = useState<string | null>(null);
  const [burndownData, setBurndownData] = useState<BurndownPoint[]>([]);
  const [loadingBurndown, setLoadingBurndown] = useState(false);

  const toggleBurndown = useCallback(
    (krId: string) => {
      if (burndownKrId === krId) {
        setBurndownKrId(null);
        setBurndownData([]);
        return;
      }
      setBurndownKrId(krId);
      setLoadingBurndown(true);
      fetch(`/api/metrics/burndown/${krId}`)
        .then((r) => r.json())
        .then((data: BurndownPoint[]) => {
          setBurndownData(data);
          setLoadingBurndown(false);
        })
        .catch(() => {
          setBurndownData([]);
          setLoadingBurndown(false);
        });
    },
    [burndownKrId],
  );

  return (
    <div>
      {/* Page header with LCARS bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: "var(--bar-width)",
            height: 28,
            background: "var(--color-coral)",
          }}
        />
        <h1
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          PROJECT TIMELINE
        </h1>
      </div>

      {/* LCARS section frame */}
      <div
        style={{
          border: "1px solid rgba(138,130,120,0.2)",
          padding: 16,
          background: "var(--bg-surface)",
        }}
      >
        {/* Color legend */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 12,
            fontSize: 11,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Objective", h: 10, w: 32 },
            { label: "Key Result", h: 8, w: 24 },
            { label: "Task", h: 6, w: 18 },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: item.w,
                  height: item.h,
                  background: "var(--color-amber)",
                  opacity: item.label === "Task" ? 0.5 : item.label === "Key Result" ? 0.75 : 1,
                }}
              />
              {item.label}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 10, background: "rgba(0,0,0,0.25)", border: "1px solid var(--text-muted)" }} />
            Progress
          </div>
        </div>

        <GanttChart onKrClick={toggleBurndown} activeBurndownKrId={burndownKrId} />

        {/* Inline burndown mini-chart */}
        {burndownKrId && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "var(--bg-primary)",
              border: "1px solid rgba(138,130,120,0.2)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 8,
                letterSpacing: "0.04em",
              }}
            >
              BURNDOWN — {burndownKrId.slice(0, 8)}
            </div>
            {loadingBurndown ? (
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading...</p>
            ) : burndownData.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                No burndown data for this key result.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 2,
                  height: 60,
                }}
              >
                {burndownData.map((pt, i) => {
                  const maxSp = Math.max(...burndownData.map((p) => p.spRemaining), 1);
                  const h = (pt.spRemaining / maxSp) * 100;
                  return (
                    <div
                      key={i}
                      title={`${pt.date}: ${pt.spRemaining} SP`}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        background: "var(--color-sage)",
                        minWidth: 2,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
