import { describe, it, expect, vi } from "vitest";
import { calculateVelocity, computeTeamVelocity, type VelocityWindow } from "../velocity.js";
import { computeBurndown, type BurndownPoint } from "../burndown.js";
import { projectEta } from "../projection.js";
import { computeGanttBars, type GanttInput } from "../gantt.js";
import { forecast, type ForecastTask, type ForecastConfig } from "../forecast.js";
import { getCommitMetrics, getPrMetrics } from "../git-metrics.js";

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

  it("includes spPerPerson when teamSize provided", () => {
    const tasks = [
      makeTask({
        estimationHistory: [
          { date: "2026-01-01T00:00:00.000Z", spRemaining: 10, estimator: "a" },
          { date: "2026-01-03T00:00:00.000Z", spRemaining: 0, estimator: "a" },
        ],
      }),
    ];
    const result = calculateVelocity(tasks, 7, 2);
    expect(result[0].spPerPerson).toBe(5);
  });
});

describe("computeTeamVelocity", () => {
  it("returns null for no windows", () => {
    expect(computeTeamVelocity([])).toBeNull();
  });

  it("averages last 3 windows", () => {
    const windows: VelocityWindow[] = [
      { start: "2026-01-01", end: "2026-01-07", completedSp: 10, taskCount: 2 },
      { start: "2026-01-08", end: "2026-01-14", completedSp: 20, taskCount: 3 },
      { start: "2026-01-15", end: "2026-01-21", completedSp: 15, taskCount: 2 },
    ];
    expect(computeTeamVelocity(windows)).toBe(15); // (10+20+15)/3
  });
});

describe("forecast", () => {
  const baseConfig: ForecastConfig = {
    teamSize: 2,
    initialVelocity: 14, // 14 SP/week = 1 SP/person/day
    computedVelocity: null,
  };

  it("returns empty schedule for no active tasks", () => {
    const result = forecast([], baseConfig, "2026-01-01");
    expect(result.schedule).toEqual([]);
    expect(result.projectedEnd).toBe("2026-01-01");
  });

  it("schedules independent tasks in parallel up to teamSize", () => {
    const tasks: ForecastTask[] = [
      { id: "a", status: "to-do", spRemaining: 7, dependsOn: [], assignee: null },
      { id: "b", status: "to-do", spRemaining: 7, dependsOn: [], assignee: null },
    ];
    const result = forecast(tasks, baseConfig, "2026-01-01");
    expect(result.schedule.length).toBe(2);
    // Both should start on the same day (2 slots, 2 tasks)
    expect(result.schedule[0].projectedStart).toBe("2026-01-01");
    expect(result.schedule[1].projectedStart).toBe("2026-01-01");
    // Each takes 7 SP / 1 SP/person/day = 7 days
    expect(result.schedule[0].projectedEnd).toBe("2026-01-08");
  });

  it("forces linearity when teamSize=1", () => {
    const tasks: ForecastTask[] = [
      { id: "a", status: "to-do", spRemaining: 7, dependsOn: [], assignee: null },
      { id: "b", status: "to-do", spRemaining: 7, dependsOn: [], assignee: null },
    ];
    const config: ForecastConfig = { teamSize: 1, initialVelocity: 7, computedVelocity: null };
    const result = forecast(tasks, config, "2026-01-01");
    // With 1 person at 7SP/wk = 1 SP/day, 7SP task = 7 days
    // Task a: Jan 1-8, task b: Jan 8-15
    expect(result.schedule[0].projectedEnd).toBe("2026-01-08");
    expect(result.schedule[1].projectedStart).toBe("2026-01-08");
    expect(result.schedule[1].projectedEnd).toBe("2026-01-15");
  });

  it("respects dependencies", () => {
    const tasks: ForecastTask[] = [
      { id: "a", status: "to-do", spRemaining: 7, dependsOn: [], assignee: null },
      { id: "b", status: "to-do", spRemaining: 7, dependsOn: ["a"], assignee: null },
    ];
    const result = forecast(tasks, baseConfig, "2026-01-01");
    // b must wait for a to complete
    const aEnd = result.schedule.find((s) => s.taskId === "a")!.projectedEnd;
    const bStart = result.schedule.find((s) => s.taskId === "b")!.projectedStart;
    expect(bStart >= aEnd).toBe(true);
  });

  it("routes assigned tasks to the same slot", () => {
    const tasks: ForecastTask[] = [
      { id: "a", status: "to-do", spRemaining: 7, dependsOn: [], assignee: "alice@test.com" },
      { id: "b", status: "to-do", spRemaining: 7, dependsOn: [], assignee: "alice@test.com" },
      { id: "c", status: "to-do", spRemaining: 7, dependsOn: [], assignee: null },
    ];
    const result = forecast(tasks, baseConfig, "2026-01-01");
    // Alice gets both a and b sequentially, c runs in parallel
    const aResult = result.schedule.find((s) => s.taskId === "a")!;
    const bResult = result.schedule.find((s) => s.taskId === "b")!;
    const cResult = result.schedule.find((s) => s.taskId === "c")!;
    expect(aResult.assignedSlot).toBe(bResult.assignedSlot);
    // b starts after a (same person)
    expect(bResult.projectedStart >= aResult.projectedEnd).toBe(true);
    // c starts immediately (different slot)
    expect(cResult.projectedStart).toBe("2026-01-01");
  });

  it("uses computedVelocity over initialVelocity", () => {
    const tasks: ForecastTask[] = [
      { id: "a", status: "to-do", spRemaining: 14, dependsOn: [], assignee: null },
    ];
    const config: ForecastConfig = {
      teamSize: 1,
      initialVelocity: 7, // would give 14 days
      computedVelocity: 14, // gives 7 days
    };
    const result = forecast(tasks, config, "2026-01-01");
    // 14 SP / (14/7 = 2 SP/day) = 7 days
    expect(result.schedule[0].projectedEnd).toBe("2026-01-08");
    expect(result.velocityUsed).toBe(14);
  });

  it("handles done tasks as resolved dependencies", () => {
    const tasks: ForecastTask[] = [
      { id: "done1", status: "done", spRemaining: 0, dependsOn: [], assignee: null },
      { id: "b", status: "to-do", spRemaining: 7, dependsOn: ["done1"], assignee: null },
    ];
    const result = forecast(tasks, baseConfig, "2026-01-01");
    // b should start immediately since done1 is already done
    expect(result.schedule[0].projectedStart).toBe("2026-01-01");
  });
});

describe("computeGanttBars with forecast", () => {
  it("marks non-done tasks as forecast when config provided", () => {
    const items: GanttInput[] = [
      {
        id: "t1",
        type: "task",
        name: "Task",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "to-do",
        estimationHistory: [
          { date: "2026-01-01T00:00:00.000Z", spRemaining: 5, estimator: "a" },
        ],
      },
    ];
    const config: ForecastConfig = {
      teamSize: 1,
      initialVelocity: 7,
      computedVelocity: null,
    };
    const result = computeGanttBars(items, config);
    expect(result[0].isForecast).toBe(true);
  });

  it("done tasks are not forecast", () => {
    const items: GanttInput[] = [
      {
        id: "t1",
        type: "task",
        name: "Task",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "done",
        estimationHistory: [
          { date: "2026-01-01T00:00:00.000Z", spRemaining: 5, estimator: "a" },
          { date: "2026-01-05T00:00:00.000Z", spRemaining: 0, estimator: "a" },
        ],
      },
    ];
    const config: ForecastConfig = {
      teamSize: 1,
      initialVelocity: 7,
      computedVelocity: null,
    };
    const result = computeGanttBars(items, config);
    expect(result[0].isForecast).toBeFalsy();
    expect(result[0].progress).toBe(100);
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

describe("computeGanttBars", () => {
  it("returns empty array for no items", () => {
    expect(computeGanttBars([])).toEqual([]);
  });

  it("computes bars from items with dates", () => {
    const items: GanttInput[] = [
      {
        id: "1",
        type: "task",
        name: "Task A",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "done",
        estimationHistory: [
          { date: "2026-01-01T00:00:00.000Z", spRemaining: 5, estimator: "a" },
          { date: "2026-01-05T00:00:00.000Z", spRemaining: 0, estimator: "a" },
        ],
      },
    ];
    const result = computeGanttBars(items);
    expect(result.length).toBe(1);
    expect(result[0].start).toBe("2026-01-01");
    expect(result[0].end).toBe("2026-01-05");
    expect(result[0].progress).toBe(100);
  });

  it("uses parentId for nesting", () => {
    const items: GanttInput[] = [
      { id: "obj1", type: "objective", name: "Obj", createdAt: "2026-01-01T00:00:00.000Z", status: "in-progress" },
      { id: "kr1", type: "key-result", name: "KR", createdAt: "2026-01-02T00:00:00.000Z", status: "to-do", parentId: "obj1" },
    ];
    const result = computeGanttBars(items);
    expect(result.length).toBe(2);
    expect(result.find((b) => b.id === "kr1")?.parentId).toBe("obj1");
  });

  it("handles items with no estimation history", () => {
    const items: GanttInput[] = [
      { id: "1", type: "task", name: "T", createdAt: "2026-01-01T00:00:00.000Z", status: "to-do" },
    ];
    const result = computeGanttBars(items);
    expect(result.length).toBe(1);
    expect(result[0].progress).toBe(0);
  });
});

describe("getCommitMetrics", () => {
  it("returns zero metrics when no commits found", () => {
    const mockExec = vi.fn().mockReturnValue("");
    const result = getCommitMetrics("fake-uuid", undefined, mockExec);
    expect(result.totalCommits).toBe(0);
    expect(result.frequency).toEqual([]);
  });

  it("parses commit data from git output", () => {
    const mockExec = vi.fn()
      .mockReturnValueOnce(
        "abc123|2026-01-01T00:00:00Z|feat: something\ndef456|2026-01-02T00:00:00Z|fix: other"
      )
      .mockReturnValueOnce(" 2 files changed, 10 insertions(+), 3 deletions(-)")
      .mockReturnValueOnce(" 1 file changed, 5 insertions(+), 1 deletion(-)");
    const result = getCommitMetrics("some-uuid", "/repo", mockExec);
    expect(result.totalCommits).toBe(2);
    expect(result.totalAdditions).toBe(15);
    expect(result.totalDeletions).toBe(4);
  });
});

describe("getPrMetrics", () => {
  it("returns zero metrics when no merge commits", () => {
    const mockExec = vi.fn().mockReturnValue("");
    const result = getPrMetrics("fake-uuid", undefined, mockExec);
    expect(result.mergeCommits).toBe(0);
    expect(result.totalWeight).toBe(0);
  });

  it("parses merge commit stats", () => {
    const mockExec = vi.fn().mockReturnValue(
      "10\t2\tfile1.ts\n5\t1\tfile2.ts"
    );
    const result = getPrMetrics("some-uuid", "/repo", mockExec);
    expect(result.mergeCommits).toBe(2);
    expect(result.totalWeight).toBe(18); // 10+2+5+1
  });
});
