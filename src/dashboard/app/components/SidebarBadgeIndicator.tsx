import { useEffect, useState } from "react";

type BadgeInfo = {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
};

const STORAGE_KEY = "7even-badges-last-viewed";

export function SidebarBadgeIndicator() {
  const [newBadges, setNewBadges] = useState<BadgeInfo[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastViewed = localStorage.getItem(STORAGE_KEY) ?? "1970-01-01T00:00:00Z";

    fetch("/api/badges")
      .then((r) => r.json())
      .then((data: { available: BadgeInfo[] }) => {
        const fresh = data.available.filter(
          (b) => b.earned && b.earnedAt && b.earnedAt > lastViewed
        );
        setNewBadges(fresh);
      })
      .catch(() => {});
  }, []);

  function handleClick() {
    setOpen((o) => !o);
    if (!open) {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      // Clear pulsing after viewing
      setTimeout(() => setNewBadges([]), 300);
    }
  }

  if (newBadges.length === 0 && !open) return null;

  return (
    <div style={{ position: "relative", padding: "8px 16px" }}>
      <button
        onClick={handleClick}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-primary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          width: "100%",
          padding: 0,
        }}
      >
        <span
          style={{
            display: "inline-block",
            animation: newBadges.length > 0 ? "badge-pulse 2s infinite" : "none",
          }}
        >
          🏅
        </span>
        <span>{newBadges.length} NEW BADGE{newBadges.length !== 1 ? "S" : ""}</span>
      </button>

      {open && newBadges.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 16,
            right: 16,
            background: "var(--bg-surface)",
            border: "var(--bar-width) solid var(--border-subtle)",
            padding: 12,
            zIndex: 10,
          }}
        >
          {newBadges.map((b) => (
            <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{b.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>{b.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
