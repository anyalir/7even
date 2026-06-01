import { NavLink } from "react-router";
import { useEffect, useState } from "react";
import { VelocityChart } from "./VelocityChart.js";
import { SidebarBadgeIndicator } from "./SidebarBadgeIndicator.js";

export const NAV_ITEMS = [
  { to: "/timeline", label: "TIMELINE", color: "var(--color-coral)" },
  { to: "/board", label: "BOARD", color: "var(--color-amber)" },
  { to: "/achievements", label: "ACHIEVEMENTS", color: "var(--color-sage)" },
  { to: "/analytics", label: "ANALYTICS", color: "var(--color-blue)" },
];

type BadgeAvailable = {
  id: string;
  earned: boolean;
  earnedAt: string | null;
};

const BADGE_VIEWED_KEY = "7even-badges-last-viewed";

export function LcarsSidebar() {
  const [hasNew, setHasNew] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    const lastViewed = localStorage.getItem(BADGE_VIEWED_KEY) ?? "1970-01-01T00:00:00Z";

    fetch("/api/badges")
      .then((r) => r.json())
      .then((data: { earned: unknown[]; available: BadgeAvailable[] }) => {
        setBadgeCount(data.earned.length);
        const fresh = data.available.filter(
          (b) => b.earned && b.earnedAt && b.earnedAt > lastViewed
        );
        if (fresh.length > 0) setHasNew(true);
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

      {/* Dot separator */}
      <div style={{ display: "flex", gap: 4, padding: "0 16px 8px" }}>
        {NAV_ITEMS.map((item) => (
          <div key={item.to} style={{ width: 3, height: 3, background: item.color, opacity: 0.6 }} />
        ))}
      </div>

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

      {/* Badge indicator */}
      <SidebarBadgeIndicator />

      {/* Dot separator */}
      <div style={{ display: "flex", gap: 4, padding: "8px 16px" }}>
        {NAV_ITEMS.map((item) => (
          <div key={item.to} style={{ width: 3, height: 3, background: item.color, opacity: 0.6 }} />
        ))}
      </div>

      {/* Velocity widget (compact) */}
      <div style={{ padding: "12px 16px" }}>
        <VelocityChart compact />
        <div style={{ marginTop: 8, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span style={{ color: "var(--text-muted)" }}>BADGES: </span>
          {badgeCount} EARNED
        </div>
      </div>
    </nav>
  );
}
