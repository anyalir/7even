export type VelocityWindow = {
  start: string;
  end: string;
  completedSp: number;
  taskCount: number;
  /** SP per person (completedSp / teamSize) */
  spPerPerson?: number;
};

type TaskLike = {
  status: string;
  estimationHistory: Array<{
    date: string;
    spRemaining: number;
    estimator: string;
  }>;
};

export function calculateVelocity(
  doneTasks: TaskLike[],
  windowDays = 7,
  teamSize = 1
): VelocityWindow[] {
  // Filter to tasks with estimation history that reached 0 SP
  const completed: Array<{ completionDate: string; sp: number }> = [];

  for (const task of doneTasks) {
    const hist = task.estimationHistory;
    if (hist.length < 2) continue;

    // Initial SP = first entry's spRemaining
    const initialSp = hist[0].spRemaining;
    // Completion date = last entry's date
    const lastEntry = hist[hist.length - 1];
    // Only count if SP went down (task made progress)
    if (initialSp <= 0) continue;

    completed.push({
      completionDate: lastEntry.date.slice(0, 10),
      sp: initialSp,
    });
  }

  if (completed.length === 0) return [];

  // Sort by completion date
  completed.sort((a, b) => a.completionDate.localeCompare(b.completionDate));

  // Group into windows
  const windows: VelocityWindow[] = [];
  let windowStart = new Date(completed[0].completionDate);

  while (completed.length > 0) {
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + windowDays - 1);

    const startStr = windowStart.toISOString().slice(0, 10);
    const endStr = windowEnd.toISOString().slice(0, 10);

    let sp = 0;
    let count = 0;
    const remaining: typeof completed = [];

    for (const item of completed) {
      if (item.completionDate >= startStr && item.completionDate <= endStr) {
        sp += item.sp;
        count++;
      } else {
        remaining.push(item);
      }
    }

    if (count > 0) {
      windows.push({
        start: startStr,
        end: endStr,
        completedSp: sp,
        taskCount: count,
        spPerPerson: Math.round((sp / teamSize) * 10) / 10,
      });
    }

    completed.length = 0;
    completed.push(...remaining);

    // Move to next window
    windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() + 1);
  }

  return windows;
}

/**
 * Compute team velocity in SP/week from historical windows.
 * Returns null if no data.
 */
export function computeTeamVelocity(windows: VelocityWindow[]): number | null {
  if (windows.length === 0) return null;
  const recent = windows.slice(-3);
  const totalSp = recent.reduce((s, w) => s + w.completedSp, 0);
  return Math.round((totalSp / recent.length) * 10) / 10;
}
