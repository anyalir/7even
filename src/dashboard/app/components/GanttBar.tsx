type Props = {
  name: string;
  type: string;
  startPct: number;
  widthPct: number;
  color: string;
  progress: number;
  spRemaining?: number;
  startDate: string;
  endDate: string;
};

const HEIGHT: Record<string, number> = {
  objective: 32,
  "key-result": 24,
  task: 18,
};

export function GanttBar({
  name,
  type,
  startPct,
  widthPct,
  color,
  progress,
  spRemaining,
  startDate,
  endDate,
}: Props) {
  const h = HEIGHT[type] ?? 24;

  return (
    <div
      style={{
        position: "absolute",
        left: `${startPct}%`,
        width: `${Math.max(widthPct, 0.5)}%`,
        height: h,
        top: "50%",
        transform: "translateY(-50%)",
        background: color,
        overflow: "hidden",
        cursor: "default",
      }}
      title={`${name}\n${startDate} → ${endDate}${spRemaining != null ? `\n${spRemaining} SP remaining` : ""}`}
    >
      {/* Progress fill */}
      {progress > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.min(progress, 100)}%`,
            background: "rgba(0,0,0,0.25)",
          }}
        />
      )}
      {/* Label for objectives */}
      {type === "objective" && widthPct > 5 && (
        <span
          style={{
            position: "relative",
            zIndex: 1,
            padding: "0 6px",
            fontSize: 11,
            fontWeight: 600,
            lineHeight: `${h}px`,
            color: "var(--bg-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "block",
          }}
        >
          {name}
        </span>
      )}
    </div>
  );
}
