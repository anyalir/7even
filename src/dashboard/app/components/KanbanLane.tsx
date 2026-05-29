import type { TaskData } from "./TaskCard.js";
import { TaskCard } from "./TaskCard.js";

interface KanbanLaneProps {
  krName: string;
  color: string;
  tasks: TaskData[];
  collapsed?: boolean;
  onToggle: () => void;
  onTaskClick: (task: TaskData) => void;
}

const STATUS_COLUMNS = ["to-do", "in-progress", "done"] as const;
const STATUS_LABELS: Record<string, string> = {
  "to-do": "TO DO",
  "in-progress": "IN PROGRESS",
  done: "DONE",
};

export function KanbanLane({
  krName,
  color,
  tasks,
  collapsed = false,
  onToggle,
  onTaskClick,
}: KanbanLaneProps) {
  const grouped = STATUS_COLUMNS.map((status) => ({
    status,
    tasks: tasks.filter((t) => t.status === status),
  }));

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={onToggle}
      >
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          {collapsed ? "▶" : "▼"}
        </span>
        <h3
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: 13,
            fontWeight: 600,
            color,
          }}
        >
          {krName}
        </h3>
        <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: "auto" }}>
          {tasks.length} tasks
        </span>
      </div>
      <div
        style={{
          height: "var(--bar-width)",
          background: color,
          marginTop: 4,
          marginBottom: collapsed ? 0 : 12,
        }}
      />
      {!collapsed && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          {grouped.map(({ status, tasks: colTasks }) => (
            <div key={status}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                {STATUS_LABELS[status]} ({colTasks.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    color={color}
                    onClick={() => onTaskClick(task)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
