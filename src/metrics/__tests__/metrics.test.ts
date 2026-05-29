import { describe, it, expect } from "vitest";
import { calculateVelocity, type VelocityWindow } from "../velocity.js";
import { computeBurndown, type BurndownPoint } from "../burndown.js";
import { projectEta } from "../projection.js";

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    status: "done" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test@example.com",
    description: "Test task",
    schemaVersion: 2,
    parentId: null,
    comments: [],
    assignee: null,
    estimationHistory: [] as Array<{
      date: string;
      spRemaining: number;
      estimator: string;
    }>,
    acceptanceCriteria: [],
    ...overrides,
  };
}

describe("calculateVelocity", () => {
  it("returns empty array for no tasks", () => {
    expect(calculateVelocity([])).toEqual([]);
  });

  it("groups completed tasks into 7-day windows", () => {
    const tasks = [
      makeTask({
        estimationHistory: [
          { date: "2026-01-01T00:00:00.000Z", spRemaining: 5, estimator: "a" },
          { date: "2026-01-03T00:00:00.000Z", spRemaining: 0, estimator: "a" },
        ],
      }),
      makeTask({
        estimationHistory: [
          { date: "2026-01-02T00:00:00.000Z", spRemaining: 3, estimator: "a" },
          { date: "2026-01-04T00:00:00.000Z", spRemaining: 0, estimator: "a" },
        ],
      }),
    ];
    const result = calculateVelocity(tasks);
    expect(result.length).toBeGreaterThanOrEqual(1);
    // Both tasks completed in same week window
    expect(result[0].completedSp).toBe(8); // 5 + 3
    expect(result[0].taskCount).toBe(2);
  });

  it("separates tasks into different windows", () => {
    const tasks = [
      makeTask({
        estimationHistory: [
          { date: "2026-01-01T00:00:00.000Z", spRemaining: 5, estimator: "a" },
          { date: "2026-01-02T00:00:00.000Z", spRemaining: 0, estimator: "a" },
        ],
      }),
      makeTask({
        estimationHistory: [
          { date: "2026-01-10T00:00:00.000Z", spRemaining: 3, estimator: "a" },
          { date: "2026-01-15T00:00:00.000Z", spRemaining: 0, estimator: "a" },
        ],
      }),
    ];
    const result = calculateVelocity(tasks, 7);
    expect(result.length).toBe(2);
  });

  it("skips tasks with no estimation history", () => {
    const tasks = [makeTask({ estimationHistory: [] })];
    expect(calculateVelocity(tasks)).toEqual([]);
  });
});

describe("computeBurndown", () => {
  it("returns empty array for no tasks", () => {
    expect(computeBurndown([])).toEqual([]);
  });

  it("computes running remaining SP from estimation history", () => {
    const tasks = [
      makeTask({
        estimationHistory: [
          { date: "2026-01-01T00:00:00.000Z", spRemaining: 5, estimator: "a" },
          { date: "2026-01-03T00:00:00.000Z", spRemaining: 2, estimator: "a" },
        ],
      }),
      makeTask({
        estimationHistory: [
          { date: "2026-01-01T00:00:00.000Z", spRemaining: 3, estimator: "a" },
          { date: "2026-01-02T00:00:00.000Z", spRemaining: 0, estimator: "a" },
        ],
      }),
    ];
    const result = computeBurndown(tasks);
    expect(result.length).toBeGreaterThan(0);
    // First point should have total initial SP
    expect(result[0].remaining).toBe(8); // 5 + 3
    // Last point should reflect final remaining
    expect(result[result.length - 1].remaining).toBe(2); // 2 + 0
  });

  it("includes ideal line", () => {
    const tasks = [
      makeTask({
        estimationHistory: [
          { date: "2026-01-01T00:00:00.000Z", spRemaining: 10, estimator: "a" },
          { date: "2026-01-05T00:00:00.000Z", spRemaining: 0, estimator: "a" },
        ],
      }),
    ];
    const result = computeBurndown(tasks);
    expect(result[0].ideal).toBe(10);
    expect(result[result.length - 1].ideal).toBe(0);
  });
});

describe("projectEta", () => {
  it("returns low confidence with no velocity data", () => {
    const result = projectEta(10, []);
    expect(result.confidence).toBe("low");
  });

  it("calculates ETA from velocity windows", () => {
    const windows: VelocityWindow[] = [
      { start: "2026-01-01", end: "2026-01-07", completedSp: 14, taskCount: 2 },
      { start: "2026-01-08", end: "2026-01-14", completedSp: 7, taskCount: 1 },
      { start: "2026-01-15", end: "2026-01-21", completedSp: 21, taskCount: 3 },
    ];
    const result = projectEta(14, windows);
    // avg = (14+7+21)/3 = 14 SP/week = 2 SP/day
    // 14 SP / 2 SP/day = 7 days
    expect(result.eta).toBeTruthy();
    expect(result.confidence).toBe("medium"); // 3 windows
  });

  it("high confidence with 5+ windows", () => {
    const windows: VelocityWindow[] = Array.from({ length: 6 }, (_, i) => ({
      start: `2026-01-0${i + 1}`,
      end: `2026-01-0${i + 2}`,
      completedSp: 7,
      taskCount: 1,
    }));
    const result = projectEta(7, windows);
    expect(result.confidence).toBe("high");
  });
});
