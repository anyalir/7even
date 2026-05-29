import type { BadgeDefinition } from "../types.js";

export const builtinBadges: BadgeDefinition[] = [
  {
    id: "first-blood",
    name: "First Blood",
    description: "Complete your first task",
    icon: "🩸",
    category: "milestone",
    check: (state) => state.tasks.some((t) => t.status === "done"),
  },
  {
    id: "hat-trick",
    name: "Hat Trick",
    description: "Complete 3 tasks in one day",
    icon: "🎩",
    category: "streak",
    check: (state) => {
      const doneTasks = state.tasks.filter((t) => t.status === "done");
      // Group by date from estimation history (last entry date as proxy for completion)
      const byDate = new Map<string, number>();
      for (const t of doneTasks) {
        const lastEst = t.estimationHistory[t.estimationHistory.length - 1];
        if (lastEst) {
          const day = lastEst.date.slice(0, 10);
          byDate.set(day, (byDate.get(day) ?? 0) + 1);
        }
      }
      return [...byDate.values()].some((count) => count >= 3);
    },
  },
  {
    id: "key-master",
    name: "Key Master",
    description: "Achieve a key result",
    icon: "🔑",
    category: "milestone",
    check: (state) => state.keyResults.some((kr) => kr.status === "achieved"),
  },
  {
    id: "visionary",
    name: "Visionary",
    description: "Achieve an objective",
    icon: "👁️",
    category: "milestone",
    check: (state) => state.objectives.some((o) => o.status === "achieved"),
  },
  {
    id: "estimator",
    name: "Estimator",
    description: "Re-estimate a task 3 or more times",
    icon: "📐",
    category: "quality",
    check: (state) =>
      state.tasks.some((t) => t.estimationHistory.length >= 3),
  },
  {
    id: "full-house",
    name: "Full House",
    description: "Have tasks in all 3 statuses simultaneously",
    icon: "🃏",
    category: "milestone",
    check: (state) => {
      const statuses = new Set(state.tasks.map((t) => t.status));
      return statuses.has("to-do") && statuses.has("in-progress") && statuses.has("done");
    },
  },
  {
    id: "perfectionist",
    name: "Perfectionist",
    description: "Achieve a KR where all child tasks are done",
    icon: "💎",
    category: "quality",
    check: (state) => {
      for (const kr of state.keyResults) {
        if (kr.status !== "achieved") continue;
        const children = state.tasks.filter((t) => t.parentId === kr.id);
        if (children.length > 0 && children.every((t) => t.status === "done")) {
          return true;
        }
      }
      return false;
    },
  },
];
