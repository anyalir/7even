export type BurndownPoint = {
  date: string;
  remaining: number;
  ideal: number;
};

type TaskLike = {
  estimationHistory: Array<{
    date: string;
    spRemaining: number;
    estimator: string;
  }>;
};

export function computeBurndown(
  tasks: TaskLike[],
  _startDate?: string
): BurndownPoint[] {
  if (tasks.length === 0) return [];

  // Collect all estimation entries, keyed by task index
  const taskEntries: Map<number, Array<{ date: string; spRemaining: number }>> = new Map();

  for (let i = 0; i < tasks.length; i++) {
    const hist = tasks[i].estimationHistory;
    if (hist.length === 0) continue;
    taskEntries.set(i, [...hist].sort((a, b) => a.date.localeCompare(b.date)));
  }

  if (taskEntries.size === 0) return [];

  // Get all unique dates
  const allDates = new Set<string>();
  for (const entries of taskEntries.values()) {
    for (const e of entries) {
      allDates.add(e.date.slice(0, 10));
    }
  }
  const sortedDates = [...allDates].sort();

  // Compute initial total SP (first entry of each task)
  let initialTotal = 0;
  for (const entries of taskEntries.values()) {
    initialTotal += entries[0].spRemaining;
  }

  // For each date, compute total remaining across all tasks
  const points: BurndownPoint[] = [];
  const totalDays = sortedDates.length;

  for (let di = 0; di < sortedDates.length; di++) {
    const date = sortedDates[di];
    let totalRemaining = 0;

    for (const entries of taskEntries.values()) {
      // Find the latest entry on or before this date
      let latest = entries[0].spRemaining;
      for (const e of entries) {
        if (e.date.slice(0, 10) <= date) {
          latest = e.spRemaining;
        }
      }
      totalRemaining += latest;
    }

    const ideal =
      totalDays <= 1
        ? 0
        : initialTotal - (initialTotal * di) / (totalDays - 1);

    points.push({
      date,
      remaining: totalRemaining,
      ideal: Math.round(ideal * 100) / 100,
    });
  }

  return points;
}
