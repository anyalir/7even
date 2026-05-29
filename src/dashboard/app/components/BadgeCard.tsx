type Props = {
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
  color?: string;
};

export function BadgeCard({ icon, name, description, earned, earnedAt, color }: Props) {
  return (
    <div
      className="lcars-card"
      style={{
        opacity: earned ? 1 : 0.35,
        filter: earned ? "none" : "grayscale(1)",
        minWidth: 140,
        maxWidth: 180,
      }}
    >
      {/* LCARS dot decoration top-left */}
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          width: 3,
          height: 3,
          background: color ?? "var(--color-sage)",
        }}
      />
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div
        style={{
          fontWeight: 600,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 4,
        }}
      >
        {name}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
        {description}
      </div>
      {earned && earnedAt && (
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {new Date(earnedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
