export interface TaskData {
  id: string;
  name: string;
  status: string;
  parentId: string;
  assignee?: { name?: string; email: string };
  estimationHistory?: Array<{ date: string; spRemaining: number; estimator: string }>;
  comments?: Array<{ author: string; date: string; text: string }>;
  acceptanceCriteria?: Array<string | { description: string; script?: string }>;
  dependsOn?: string[];
  shortId?: string;
  [key: string]: unknown;
}

interface TaskCardProps {
  task: TaskData;
  color: string;
  onClick: () => void;
  /** Resolved dependency info: shortIds of incomplete dependencies */
  blockedBy?: string[];
  /** Resolved dependency info: shortIds of all dependencies */
  dependsOnIds?: string[];
}

/** SP-scaled color block width: min 4px, max 24px */
function spBlockWidth(task: TaskData): number {
  const latest = task.estimationHistory?.at(-1);
  const sp = latest?.spRemaining ?? 1;
  return Math.min(24, Math.max(4, sp * 4));
}

function initials(task: TaskData): string {
  if (!task.assignee) return "?";
  const name = task.assignee.name ?? task.assignee.email;
  return name
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function TaskCard({ task, color, onClick, blockedBy, dependsOnIds }: TaskCardProps) {
  const blockW = spBlockWidth(task);
  const latestSp = task.estimationHistory?.at(-1)?.spRemaining;
  const isBlocked = blockedBy && blockedBy.length > 0;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        background: "var(--bg-surface)",
        cursor: "pointer",
        position: "relative",
        minHeight: 48,
        opacity: isBlocked ? 0.7 : 1,
      }}
    >
      {/* SP color block — width scales with estimate */}
      <div
        style={{
          width: blockW,
          minWidth: blockW,
          background: isBlocked ? "var(--text-muted)" : color,
          opacity: 0.8,
        }}
      />
      <div style={{ flex: 1, padding: "6px 8px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>
            {(task as any).shortId && <span style={{ fontWeight: 700, opacity: 0.6, marginRight: 4, fontSize: 10 }}>{(task as any).shortId}</span>}
            {task.name}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: color,
              color: "var(--bg-primary)",
              padding: "1px 4px",
              flexShrink: 0,
            }}
          >
            {initials(task)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
          {latestSp != null && (
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {latestSp} SP
            </span>
          )}
          {isBlocked && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                color,
                background: "rgba(224,85,85,0.12)",
                padding: "1px 4px",
              }}
            >
              BLOCKED BY {blockedBy.join(", ")}
            </span>
          )}
          {!isBlocked && dependsOnIds && dependsOnIds.length > 0 && (
            <span
              style={{
                fontSize: 9,
                color,
                opacity: 0.7,
              }}
            >
              ← {dependsOnIds.join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
