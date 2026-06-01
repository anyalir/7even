import { useState } from "react";
import { useApi } from "../hooks/useApi.js";
import { KanbanLane } from "../components/KanbanLane.js";
import { AssigneeView } from "../components/AssigneeView.js";
import { TaskDetailPanel } from "../components/TaskDetailPanel.js";
import type { TaskData } from "../components/TaskCard.js";

interface KRData {
  id: string;
  name: string;
  shortId?: string;
  status: string;
  parentId: string;
  tasks: TaskData[];
}

interface ObjectiveData {
  id: string;
  name: string;
  shortId?: string;
  status: string;
  color?: string;
  keyResults: KRData[];
}

const OBJ_COLORS = [
  "var(--color-coral)",
  "var(--color-amber)",
  "var(--color-sage)",
  "var(--color-blue)",
  "var(--color-lavender)",
  "var(--color-rose)",
];

type ViewMode = "kr" | "assignee";

export function BoardPage() {
  const { data: objectives, loading, error } = useApi<ObjectiveData[]>("/api/objectives");
  const [viewMode, setViewMode] = useState<ViewMode>("kr");
  const [collapsedKrs, setCollapsedKrs] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [selectedKrTasks, setSelectedKrTasks] = useState<TaskData[]>([]);
  const [selectedObjColor, setSelectedObjColor] = useState<string>("var(--color-lavender)");

  // Auto-collapse achieved KRs on first load
  const [initialized, setInitialized] = useState(false);
  if (objectives && !initialized) {
    const achieved = new Set<string>();
    for (const obj of objectives) {
      for (const kr of obj.keyResults) {
        if (kr.status === "achieved" || kr.status === "done") {
          achieved.add(kr.id);
        }
      }
    }
    if (achieved.size > 0) setCollapsedKrs(achieved);
    setInitialized(true);
  }

  function toggleKr(krId: string) {
    setCollapsedKrs((prev) => {
      const next = new Set(prev);
      if (next.has(krId)) next.delete(krId);
      else next.add(krId);
      return next;
    });
  }

  function handleTaskClick(task: TaskData, krTasks: TaskData[], objColor?: string) {
    setSelectedTask(task);
    setSelectedKrTasks(krTasks);
    if (objColor) setSelectedObjColor(objColor);
  }

  // Collect all tasks for assignee view
  const allTasks: TaskData[] =
    objectives?.flatMap((o) => o.keyResults.flatMap((kr) => kr.tasks)) ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>TASKS BOARD</h1>
        <div style={{ display: "flex", gap: 0 }}>
          {(["kr", "assignee"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                background: viewMode === mode ? "var(--text-primary)" : "var(--bg-surface)",
                color: viewMode === mode ? "var(--bg-primary)" : "var(--text-muted)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {mode === "kr" ? "BY KR" : "BY ASSIGNEE"}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading tasks…</p>}
      {error && <p style={{ color: "var(--color-danger)" }}>Error: {error}</p>}

      {objectives && viewMode === "kr" && (
        <div>
          {objectives.map((obj, oi) => {
            const objColor = OBJ_COLORS[oi % OBJ_COLORS.length];
            return (
              <div key={obj.id} style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, background: objColor }} />
                  <span
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                    }}
                  >
                    {obj.shortId && <span style={{ marginRight: 6 }}>{obj.shortId}</span>}{obj.name}
                  </span>
                </div>
                {obj.keyResults.map((kr) => {
                  // KR shade derived from parent objective color
                  return (
                    <KanbanLane
                      key={kr.id}
                      krName={kr.shortId ? `${kr.shortId} — ${kr.name}` : kr.name}
                      color={objColor}
                      tasks={kr.tasks}
                      allTasks={allTasks}
                      collapsed={collapsedKrs.has(kr.id)}
                      onToggle={() => toggleKr(kr.id)}
                       onTaskClick={(task) => handleTaskClick(task, kr.tasks, objColor)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {objectives && viewMode === "assignee" && (
        <AssigneeView tasks={allTasks} onTaskClick={(task) => handleTaskClick(task, allTasks)} />
      )}

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          krTasks={selectedKrTasks}
          objColor={selectedObjColor}
          onClose={() => setSelectedTask(null)}
          onTaskSelect={(task) => setSelectedTask(task)}
        />
      )}
    </div>
  );
}
