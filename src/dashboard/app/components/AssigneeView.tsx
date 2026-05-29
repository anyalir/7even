import type { TaskData } from "./TaskCard.js";

interface AssigneeViewProps {
  tasks: TaskData[];
  onTaskClick: (task: TaskData) => void;
}

export function AssigneeView({ tasks, onTaskClick }: AssigneeViewProps) {
  return <div>AssigneeView placeholder</div>;
}
