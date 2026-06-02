/**
 * Forecast engine: schedule non-done tasks respecting dependencies and team capacity.
 *
 * Algorithm:
 * 1. Build dependency DAG from dependsOn[] UUIDs
 * 2. Topological sort (Kahn's algorithm)
 * 3. Simulate scheduling with N parallel slots (teamSize)
 *    - Assigned tasks go to their person's slot
 *    - Unassigned tasks fill any free slot
 *    - A task starts only when all dependsOn tasks are complete
 *    - Task duration = spRemaining / velocityPerPersonPerDay
 */

export type ForecastTask = {
  id: string;
  status: "to-do" | "in-progress" | "done";
  /** SP remaining for this task. 0 = done. */
  spRemaining: number;
  dependsOn: string[];
  /** Assignee email, or null for unassigned */
  assignee: string | null;
  /** For in-progress tasks: when they actually started */
  startedAt?: string;
};

export type ForecastConfig = {
  teamSize: number;
  /** Team velocity in SP/week. Used when no historical data. */
  initialVelocity: number | null;
  /** Computed velocity in SP/week from historical data. Takes precedence. */
  computedVelocity: number | null;
};

export type ForecastResult = {
  taskId: string;
  projectedStart: string;
  projectedEnd: string;
  assignedSlot: string; // assignee email or "slot-N"
};

export type ForecastSummary = {
  schedule: ForecastResult[];
  /** Overall projected completion date */
  projectedEnd: string;
  /** Velocity used for the forecast (SP/week) */
  velocityUsed: number;
  /** Per-person velocity (SP/week/person) */
  velocityPerPerson: number;
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.ceil(days));
  return d.toISOString().slice(0, 10);
}

function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns task IDs in execution order. Throws on cycles.
 */
function topoSort(taskIds: string[], deps: Map<string, string[]>): string[] {
  // Build in-degree map (only count deps within our task set)
  const taskSet = new Set(taskIds);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>(); // dep -> dependents

  for (const id of taskIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const id of taskIds) {
    const taskDeps = deps.get(id) ?? [];
    for (const depId of taskDeps) {
      if (taskSet.has(depId)) {
        inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
        adjacency.get(depId)!.push(id);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const dependent of adjacency.get(id) ?? []) {
      const newDeg = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) queue.push(dependent);
    }
  }

  if (sorted.length !== taskIds.length) {
    // Cycle detected — return what we can, append remaining
    const remaining = taskIds.filter((id) => !sorted.includes(id));
    return [...sorted, ...remaining];
  }

  return sorted;
}

export function forecast(
  tasks: ForecastTask[],
  config: ForecastConfig,
  today?: string
): ForecastSummary {
  const now = today ?? new Date().toISOString().slice(0, 10);

  // Determine velocity
  const velocityPerWeek =
    config.computedVelocity ?? config.initialVelocity ?? config.teamSize * 5; // fallback: 5 SP/person/week
  const velocityPerPerson = velocityPerWeek / config.teamSize;
  const spPerPersonPerDay = velocityPerPerson / 7;

  // Split tasks
  const doneTasks = tasks.filter((t) => t.status === "done");
  const activeTasks = tasks.filter((t) => t.status !== "done");

  if (activeTasks.length === 0) {
    return {
      schedule: [],
      projectedEnd: now,
      velocityUsed: velocityPerWeek,
      velocityPerPerson,
    };
  }

  // Build deps map
  const deps = new Map<string, string[]>();
  for (const t of tasks) {
    deps.set(t.id, t.dependsOn);
  }

  // Track completion times for done tasks
  const completionDate = new Map<string, string>();
  for (const t of doneTasks) {
    completionDate.set(t.id, now); // done tasks "completed" in the past, use now as bound
  }

  // Topo sort only active tasks
  const activeIds = activeTasks.map((t) => t.id);
  const sorted = topoSort(activeIds, deps);

  // Build task lookup
  const taskMap = new Map<ForecastTask["id"], ForecastTask>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  // Slot tracking: each slot has a "free at" date
  // Named slots for assigned people, generic slots for unassigned work
  const slotFreeAt = new Map<string, string>();

  // Initialize slots
  for (let i = 0; i < config.teamSize; i++) {
    slotFreeAt.set(`slot-${i}`, now);
  }

  // Map assignee emails to slot names
  const assigneeSlot = new Map<string, string>();
  let nextGenericSlot = 0;

  function getSlotForAssignee(email: string | null): string {
    if (email) {
      if (!assigneeSlot.has(email)) {
        // Assign this person to a slot
        const slotName = `slot-${nextGenericSlot % config.teamSize}`;
        assigneeSlot.set(email, slotName);
        nextGenericSlot++;
      }
      return assigneeSlot.get(email)!;
    }
    // Unassigned: find earliest-free slot
    let earliest = "";
    let earliestSlot = "";
    for (const [slot, freeAt] of slotFreeAt) {
      if (earliest === "" || freeAt < earliest) {
        earliest = freeAt;
        earliestSlot = slot;
      }
    }
    return earliestSlot;
  }

  const schedule: ForecastResult[] = [];

  for (const taskId of sorted) {
    const task = taskMap.get(taskId)!;
    const sp = task.spRemaining > 0 ? task.spRemaining : 1; // minimum 1 SP for unestimated
    const duration = sp / spPerPersonPerDay; // days

    // Earliest start: max of (slot free date, all dependency completion dates)
    const slot = getSlotForAssignee(task.assignee);
    let earliestStart = slotFreeAt.get(slot) ?? now;

    // Wait for dependencies
    for (const depId of task.dependsOn) {
      const depDone = completionDate.get(depId);
      if (depDone) {
        earliestStart = maxDate(earliestStart, depDone);
      }
    }

    // For in-progress tasks, use actual start if available
    if (task.status === "in-progress" && task.startedAt) {
      earliestStart = maxDate(now, task.startedAt);
    }

    const projectedEnd = addDays(earliestStart, duration);

    schedule.push({
      taskId,
      projectedStart: earliestStart,
      projectedEnd,
      assignedSlot: task.assignee ?? slot,
    });

    // Update slot and completion tracking
    slotFreeAt.set(slot, projectedEnd);
    completionDate.set(taskId, projectedEnd);
  }

  // Overall projected end = max of all task ends
  let overallEnd = now;
  for (const s of schedule) {
    overallEnd = maxDate(overallEnd, s.projectedEnd);
  }

  return {
    schedule,
    projectedEnd: overallEnd,
    velocityUsed: velocityPerWeek,
    velocityPerPerson,
  };
}
