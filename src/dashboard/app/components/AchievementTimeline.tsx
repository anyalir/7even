type TimelineEntry = {
  badgeIcon: string;
  badgeName: string;
  earnedAt: string;
  context?: string; // associated O/KR name
};

type Props = {
  entries: TimelineEntry[];
};

export function AchievementTimeline({ entries }: Props) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", padding: 16 }}>
        No achievements yet — complete objectives and KRs to earn badges.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", paddingLeft: 20 }}>
      {/* 3px vertical timeline spine */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "var(--bar-width)",
          height: "100%",
          background: "var(--border-subtle)",
        }}
      />

      {sorted.map((entry, i) => {
        const isLeft = i % 2 === 0;
        return (
          <div
            key={`${entry.badgeName}-${entry.earnedAt}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 0",
              marginLeft: isLeft ? 0 : 24,
            }}
          >
            {/* Connector dot */}
            <div
              style={{
                position: "absolute",
                left: -2,
                marginTop: 6,
                width: 7,
                height: 7,
                background: "var(--color-sage)",
              }}
            />

            <span style={{ fontSize: 20 }}>{entry.badgeIcon}</span>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {entry.badgeName}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {new Date(entry.earnedAt).toLocaleDateString()}
              </div>
              {entry.context && (
                <div style={{ fontSize: 11, color: "var(--color-amber)", marginTop: 2 }}>
                  {entry.context}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
