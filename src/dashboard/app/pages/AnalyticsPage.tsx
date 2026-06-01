import { useEffect, useState } from "react";
import { BurndownChart } from "../components/BurndownChart.js";
import { VelocityChart } from "../components/VelocityChart.js";
import { CommitMetricsChart } from "../components/CommitMetricsChart.js";

type ScopeOption = { id: string; name: string; type: "objective" | "kr" };

export function AnalyticsPage() {
  const [scopes, setScopes] = useState<ScopeOption[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>("all");

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
          const options: ScopeOption[] = [];
          for (const obj of objs) {
            options.push({ id: obj.id, name: obj.name, type: "objective" });
            for (const kr of obj.keyResults) {
              options.push({ id: kr.id, name: kr.name, type: "kr" });
            }
          }
          setScopes(options);
        }
      )
      .catch(() => {});
  }, []);

  const selectedItem = scopes.find((s) => s.id === selectedScope);

  return (
    <div>
      <h1
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 16,
        }}
      >
        ANALYTICS
      </h1>

      {/* Scope selector */}
      <div style={{ marginBottom: 24 }}>
        <select
          value={selectedScope}
          onChange={(e) => setSelectedScope(e.target.value)}
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-subtle)",
            padding: "6px 12px",
            fontSize: 12,
            textTransform: "uppercase",
            minWidth: 240,
          }}
        >
          <option value="all">All Objectives</option>
          {scopes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.type === "kr" ? "  ↳ " : ""}
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Burndown Section */}
      <section style={{ marginBottom: 32 }}>
        <div className="lcars-section" style={{ "--lcars-accent": "var(--color-coral)" } as React.CSSProperties}>
          <h2
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-coral)",
              marginBottom: 12,
            }}
          >
            Burndown
          </h2>
          <div className="lcars-card">
            <BurndownChart
              krId={
                selectedItem?.type === "kr" ? selectedItem.id : undefined
              }
              objectiveId={
                selectedItem?.type === "objective"
                  ? selectedItem.id
                  : selectedScope === "all"
                    ? "all"
                    : undefined
              }
            />
          </div>
        </div>
      </section>

      {/* Velocity Section */}
      <section style={{ marginBottom: 32 }}>
        <div className="lcars-section" style={{ "--lcars-accent": "var(--color-sage)" } as React.CSSProperties}>
          <h2
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-sage)",
              marginBottom: 12,
            }}
          >
            Velocity
          </h2>
          <div className="lcars-card">
            <VelocityChart />
          </div>
        </div>
      </section>

      {/* Commit Metrics Section */}
      <section style={{ marginBottom: 32 }}>
        <div className="lcars-section" style={{ "--lcars-accent": "var(--color-lavender)" } as React.CSSProperties}>
          <h2
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-lavender)",
              marginBottom: 12,
            }}
          >
            Commit Metrics
          </h2>
          <div className="lcars-card">
            <CommitMetricsChart />
          </div>
        </div>
      </section>
    </div>
  );
}
