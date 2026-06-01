import { TaskCard } from "./TaskCard.js";
import type { TaskData } from "./TaskCard.js";

interface AssigneeViewProps {
  tasks: TaskData[];
  onTaskClick: (task: TaskData) => void;
}

interface AssigneeGroup {
  label: string;
  email: string | null;
  tasks: TaskData[];
}

const GROUP_COLORS = [
  "var(--color-coral)",
  "var(--color-amber)",
  "var(--color-sage)",
  "var(--color-blue)",
  "var(--color-lavender)",
  "var(--color-rose)",
];

export function AssigneeView({ tasks, onTaskClick }: AssigneeViewProps) {
  // Group by assignee email
  const groupMap = new Map<string, AssigneeGroup>();

  for (const task of tasks) {
    const email = task.assignee?.email ?? null;
    const key = email ?? "__unassigned__";
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        label: email ? (task.assignee?.name ?? email) : "Unassigned",
        email,
        tasks: [],
      });
    }
    groupMap.get(key)!.tasks.push(task);
  }

  // Sort: assigned first (alphabetical), unassigned last
  const groups = Array.from(groupMap.values()).sort((a, b) => {
    if (!a.email) return 1;
    if (!b.email) return -1;
    return a.label.localeCompare(b.label);
  });

  return (
    <div>
      {groups.map((group, gi) => {
        const color = GROUP_COLORS[gi % GROUP_COLORS.length];
        const activeTasks = group.tasks.filter((t) => t.status !== "done");
        return (
          <div key={group.email ?? "__unassigned__"} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {/* Avatar circle */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--bg-primary)",
                }}
              >
                {group.label
                  .split(/[\s@.]+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? "")
                  .join("")}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{group.label}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {activeTasks.length} active · {group.tasks.length} total
                </div>
              </div>
            </div>
            <div
              style={{
                height: "var(--bar-width)",
                background: color,
                marginBottom: 8,
                opacity: 0.5,
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 6,
              }}
            >
              {group.tasks.map((task) => {
                const deps = task.dependsOn ?? [];
                const blockedBy: string[] = [];
                const dependsOnIds: string[] = [];
                for (const depId of deps) {
                  const dep = tasks.find((t) => t.id === depId);
                  const sid = dep?.shortId ?? (dep as any)?.shortId ?? depId.slice(0, 8);
                  dependsOnIds.push(sid);
                  if (dep && dep.status !== "done") blockedBy.push(sid);
                }
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    color={color}
                    onClick={() => onTaskClick(task)}
                    blockedBy={blockedBy}
                    dependsOnIds={dependsOnIds}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
      {groups.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No tasks found</p>
      )}
    </div>
  );
}
