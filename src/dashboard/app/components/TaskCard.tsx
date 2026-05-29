export interface TaskData {
  id: string;
  name: string;
  status: string;
  parentId: string;
  assignee?: { name?: string; email: string };
  estimationHistory?: Array<{ date: string; points: number; estimator: string }>;
  comments?: Array<{ author: string; date: string; text: string }>;
  acceptanceCriteria?: string[];
  [key: string]: unknown;
}

interface TaskCardProps {
  task: TaskData;
  color: string;
  onClick: () => void;
}

/** SP-scaled color block width: min 4px, max 24px */
function spBlockWidth(task: TaskData): number {
  const latest = task.estimationHistory?.at(-1);
  const sp = latest?.points ?? 1;
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

export function TaskCard({ task, color, onClick }: TaskCardProps) {
  const blockW = spBlockWidth(task);
  const latestSp = task.estimationHistory?.at(-1)?.points;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        background: "var(--bg-surface)",
        cursor: "pointer",
        position: "relative",
        minHeight: 48,
      }}
    >
      {/* SP color block — width scales with estimate */}
      <div
        style={{
          width: blockW,
          minWidth: blockW,
          background: color,
          opacity: 0.8,
        }}
      />
      <div style={{ flex: 1, padding: "6px 8px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{task.name}</span>
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
        {latestSp != null && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              marginTop: 3,
            }}
          >
            {latestSp} SP
          </span>
        )}
      </div>
    </div>
  );
}
