import type { TaskData } from "./TaskCard.js";

interface TaskDetailPanelProps {
  task: TaskData;
  krTasks: TaskData[];
  onClose: () => void;
  onTaskSelect: (task: TaskData) => void;
}

export function TaskDetailPanel({ task, krTasks, onClose, onTaskSelect }: TaskDetailPanelProps) {
  return <div>TaskDetailPanel placeholder</div>;
}
