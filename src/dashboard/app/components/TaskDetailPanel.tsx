import { useEffect } from "react";
import { useApi } from "../hooks/useApi.js";
import type { TaskData } from "./TaskCard.js";

interface TaskDetailPanelProps {
  task: TaskData;
  krTasks: TaskData[];
  onClose: () => void;
  onTaskSelect: (task: TaskData) => void;
}

interface CommitData {
  hash: string;
  date: string;
  message: string;
}

const STATUS_LABEL: Record<string, string> = {
  "to-do": "TO DO",
  "in-progress": "IN PROGRESS",
  done: "DONE",
};

export function TaskDetailPanel({ task, krTasks, onClose, onTaskSelect }: TaskDetailPanelProps) {
  const { data: commits } = useApi<CommitData[]>(`/api/metrics/commits/${task.id}`);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 999,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(520px, 90vw)",
          display: "flex",
          zIndex: 1000,
        }}
      >
        {/* LCARS vertical divider / KR quick-nav */}
        <div
          style={{
            width: 140,
            background: "var(--bg-surface)",
            borderRight: "var(--bar-width) solid var(--color-lavender)",
            display: "flex",
            flexDirection: "column",
            padding: "48px 0 16px 0",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              padding: "0 8px 8px",
              textTransform: "uppercase",
            }}
          >
            KR TASKS
          </div>
          {krTasks.map((t) => (
            <div
              key={t.id}
              onClick={() => onTaskSelect(t)}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                cursor: "pointer",
                borderLeft:
                  t.id === task.id
                    ? "var(--bar-width) solid var(--color-lavender)"
                    : "var(--bar-width) solid transparent",
                color: t.id === task.id ? "var(--text-primary)" : "var(--text-muted)",
                background: t.id === task.id ? "rgba(255,255,255,0.05)" : "transparent",
              }}
            >
              {t.name}
            </div>
          ))}
        </div>

        {/* Detail content — dark-on-light */}
        <div
          className="panel-detail"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            position: "relative",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "inherit",
              lineHeight: 1,
            }}
          >
            ✕
          </button>

          {/* Task name & status */}
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, paddingRight: 32 }}>
            {task.name}
          </h2>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              padding: "2px 6px",
              display: "inline-block",
              marginBottom: 16,
            }}
          >
            {STATUS_LABEL[task.status] ?? task.status}
          </span>

          {/* Estimation history */}
          {task.estimationHistory && task.estimationHistory.length > 0 && (
            <Section title="ESTIMATION HISTORY">
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.15)" }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>SP</th>
                    <th style={thStyle}>Estimator</th>
                  </tr>
                </thead>
                <tbody>
                  {task.estimationHistory.map((e, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                      <td style={tdStyle}>{formatDate(e.date)}</td>
                      <td style={tdStyle}>{e.points}</td>
                      <td style={tdStyle}>{e.estimator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Comments */}
          {task.comments && task.comments.length > 0 && (
            <Section title="COMMENTS">
              {task.comments.map((c, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>
                    {c.author}{" "}
                    <span style={{ fontWeight: 400, opacity: 0.6 }}>{formatDate(c.date)}</span>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>{c.text}</div>
                </div>
              ))}
            </Section>
          )}

          {/* Git commits */}
          <Section title="GIT COMMITS">
            {commits === null ? (
              <p style={{ fontSize: 12, opacity: 0.5 }}>Loading…</p>
            ) : commits.length === 0 ? (
              <p style={{ fontSize: 12, opacity: 0.5 }}>No commits found</p>
            ) : (
              commits.map((c, i) => (
                <div key={i} style={{ marginBottom: 6, fontSize: 12 }}>
                  <code style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.7 }}>
                    {c.hash.slice(0, 7)}
                  </code>{" "}
                  <span style={{ opacity: 0.5 }}>{formatDate(c.date)}</span>
                  <div style={{ marginTop: 1 }}>{c.message}</div>
                </div>
              ))
            )}
          </Section>

          {/* Acceptance criteria */}
          {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
            <Section title="ACCEPTANCE CRITERIA">
              <ul style={{ paddingLeft: 16, fontSize: 12 }}>
                {task.acceptanceCriteria.map((ac, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {ac}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          marginBottom: 8,
          opacity: 0.5,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "4px 8px 4px 0",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  opacity: 0.5,
};

const tdStyle: React.CSSProperties = {
  padding: "4px 8px 4px 0",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}
