import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectState, BadgeDefinition, EarnedBadge } from "../types.js";

// Will be implemented in checker.ts
import { checkBadges, loadEarnedBadges, saveEarnedBadges } from "../checker.js";

function makeState(overrides: Partial<ProjectState> = {}): ProjectState {
  return {
    objectives: [],
    keyResults: [],
    tasks: [],
    ...overrides,
  };
}

function makeBadge(
  id: string,
  check: (s: ProjectState) => boolean
): BadgeDefinition {
  return {
    id,
    name: id,
    description: `Badge: ${id}`,
    icon: "🏆",
    category: "milestone",
    check,
  };
}

describe("checkBadges", () => {
  it("returns newly earned badges when check passes", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          status: "done",
          parentId: "kr1",
          name: "Task 1",
          estimationHistory: [],
        },
      ],
    });
    const badges = [makeBadge("first-task", (s) => s.tasks.some((t) => t.status === "done"))];
    const earned: EarnedBadge[] = [];

    const result = checkBadges(state, badges, earned);
    expect(result).toHaveLength(1);
    expect(result[0].badgeId).toBe("first-task");
    expect(result[0].earnedAt).toBeTruthy();
  });

  it("skips already-earned badges", () => {
    const state = makeState({
      tasks: [
        {
          id: "t1",
          status: "done",
          parentId: "kr1",
          name: "Task 1",
          estimationHistory: [],
        },
      ],
    });
    const badges = [makeBadge("first-task", (s) => s.tasks.some((t) => t.status === "done"))];
    const earned: EarnedBadge[] = [{ badgeId: "first-task", earnedAt: "2026-01-01T00:00:00Z" }];

    const result = checkBadges(state, badges, earned);
    expect(result).toHaveLength(0);
  });

  it("returns empty when no badges match", () => {
    const state = makeState();
    const badges = [makeBadge("impossible", () => false)];
    const result = checkBadges(state, badges, []);
    expect(result).toHaveLength(0);
  });

  it("handles multiple new badges at once", () => {
    const state = makeState({
      tasks: [
        { id: "t1", status: "done", parentId: "kr1", name: "T1", estimationHistory: [] },
      ],
      objectives: [{ id: "o1", status: "achieved", name: "O1" }],
    });
    const badges = [
      makeBadge("has-done", (s) => s.tasks.some((t) => t.status === "done")),
      makeBadge("has-obj", (s) => s.objectives.some((o) => o.status === "achieved")),
    ];
    const result = checkBadges(state, badges, []);
    expect(result).toHaveLength(2);
  });
});

describe("loadEarnedBadges / saveEarnedBadges", () => {
  const { mkdtemp, rm } = require("node:fs/promises");
  const { tmpdir } = require("node:os");
  const path = require("node:path");
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), "badges-test-"));
  });

  it("returns empty array when file does not exist", async () => {
    const result = await loadEarnedBadges(tmpDir);
    expect(result).toEqual([]);
  });

  it("round-trips earned badges through save/load", async () => {
    const badges: EarnedBadge[] = [
      { badgeId: "test-badge", earnedAt: "2026-05-29T00:00:00Z" },
    ];
    await saveEarnedBadges(tmpDir, badges);
    const loaded = await loadEarnedBadges(tmpDir);
    expect(loaded).toEqual(badges);
  });
});
