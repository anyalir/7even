import { NavLink } from "react-router";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { to: "/timeline", label: "TIMELINE", color: "var(--color-coral)" },
  { to: "/board", label: "BOARD", color: "var(--color-amber)" },
  { to: "/achievements", label: "ACHIEVEMENTS", color: "var(--color-sage)" },
  { to: "/analytics", label: "ANALYTICS", color: "var(--color-blue)" },
];

type VelocitySummary = {
  completedSp: number;
  taskCount: number;
};

export function LcarsSidebar() {
  const [velocity, setVelocity] = useState<VelocitySummary | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    fetch("/api/metrics/velocity")
      .then((r) => r.json())
      .then((windows: VelocitySummary[]) => {
        if (windows.length > 0) {
          const last = windows[windows.length - 1];
          setVelocity(last);
        }
      })
      .catch(() => {});

    fetch("/api/badges")
      .then((r) => r.json())
      .then((data: { earned: unknown[]; available: unknown[] }) => {
        setBadgeCount(data.earned.length);
        if (data.earned.length > 0) setHasNew(true);
      })
      .catch(() => {});
  }, []);

  return (
    <nav
      style={{
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px 0",
      }}
    >
      {/* Header */}
      <div style={{ padding: "0 16px 16px", textTransform: "uppercase", fontWeight: 700, fontSize: 18, letterSpacing: "0.1em" }}>
        <span style={{ color: "var(--color-coral)" }}>7</span>EVEN
      </div>

      <div className="lcars-bar-h" style={{ color: "var(--text-muted)" }} />

      {/* Nav links */}
      <div style={{ flex: 1, padding: "8px 0" }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              textTransform: "uppercase" as const,
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: "0.05em",
              background: isActive ? item.color : "transparent",
              color: isActive ? "var(--bg-primary)" : "var(--text-primary)",
              transition: "background 0.15s",
            })}
          >
            <div
              style={{
                width: "var(--bar-width)",
                height: 24,
                background: item.color,
              }}
            />
            {item.label}
            {item.label === "ACHIEVEMENTS" && hasNew && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "var(--color-coral)",
                  display: "inline-block",
                  animation: "pulse 2s infinite",
                  marginLeft: "auto",
                }}
              />
            )}
          </NavLink>
        ))}
      </div>

      <div className="lcars-bar-h" style={{ color: "var(--text-muted)" }} />

      {/* Velocity/ETA widget */}
      <div style={{ padding: "12px 16px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>VELOCITY</div>
        <div>
          {velocity
            ? `${velocity.completedSp} SP / ${velocity.taskCount} TASKS`
            : "NO DATA"}
        </div>
        <div style={{ marginTop: 8, color: "var(--text-muted)" }}>BADGES</div>
        <div>{badgeCount} EARNED</div>
      </div>
    </nav>
  );
}
