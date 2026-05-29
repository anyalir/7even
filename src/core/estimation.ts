import { readItem, updateItem } from "./storage.js";

export async function addEstimation(
  sevenDir: string,
  taskId: string,
  spRemaining: number,
  estimator: string
): Promise<void> {
  const { data } = await readItem(sevenDir, taskId);
  const history = Array.isArray(data.estimationHistory)
    ? [...data.estimationHistory]
    : [];
  history.push({
    date: new Date().toISOString(),
    spRemaining,
    estimator,
  });
  await updateItem(sevenDir, taskId, { estimationHistory: history });
}

export function getLatestEstimate(
  task: {
    estimationHistory: Array<{
      date: string;
      spRemaining: number;
      estimator: string;
    }>;
  }
): { date: string; spRemaining: number; estimator: string } | null {
  if (!task.estimationHistory || task.estimationHistory.length === 0) {
    return null;
  }
  return [...task.estimationHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
}

export function suggestReEstimate(
  task: {
    description: string;
    status: string;
    estimationHistory: Array<{
      date: string;
      spRemaining: number;
      estimator: string;
    }>;
    acceptanceCriteria?: Array<any>;
  }
): { suggestedSp: number; rationale: string } {
  const acCount = task.acceptanceCriteria?.length ?? 0;

  if (!task.estimationHistory || task.estimationHistory.length === 0) {
    // Heuristic based on description length
    const len = task.description.length;
    let baseSp: number;
    if (len < 50) {
      baseSp = 1;
    } else if (len < 150) {
      baseSp = 3;
    } else {
      baseSp = 5;
    }
    // Factor in acceptance criteria
    if (acCount > 3) baseSp = Math.max(baseSp, acCount);
    return {
      suggestedSp: baseSp,
      rationale: `No prior estimates. Heuristic based on description length (${len} chars)${acCount > 0 ? ` and ${acCount} acceptance criteria` : ""}.`,
    };
  }

  // Has history: adjust latest based on status
  const latest = getLatestEstimate(task)!;
  let adjusted = latest.spRemaining;

  if (task.status === "in-progress") {
    adjusted = Math.max(1, Math.round(adjusted * 0.7));
  }
  // Factor in acceptance criteria
  if (acCount > 3 && adjusted < acCount) {
    adjusted = acCount;
  }

  const rationale =
    task.status === "in-progress"
      ? `Task in progress, reduced from ${latest.spRemaining} SP by ~30%.`
      : `Based on latest estimate of ${latest.spRemaining} SP.`;

  return { suggestedSp: adjusted, rationale };
}
