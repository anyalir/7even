import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectState, BadgeDefinition, EarnedBadge } from "../types.js";
import { checkBadges, loadEarnedBadges, saveEarnedBadges } from "../checker.js";
import { builtinBadges } from "../builtins/index.js";
import { loadCustomBadges } from "../loader.js";

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

describe("builtinBadges", () => {
  it("all have required fields", () => {
    for (const badge of builtinBadges) {
      expect(badge.id).toBeTruthy();
      expect(badge.name).toBeTruthy();
      expect(badge.description).toBeTruthy();
      expect(badge.icon).toBeTruthy();
      expect(["milestone", "streak", "quality", "custom"]).toContain(badge.category);
      expect(typeof badge.check).toBe("function");
    }
  });

  it("has at least 6 badges", () => {
    expect(builtinBadges.length).toBeGreaterThanOrEqual(6);
  });

  it("first-blood triggers on completed task", () => {
    const badge = builtinBadges.find((b) => b.id === "first-blood")!;
    const state = makeState({
      tasks: [{ id: "t1", status: "done", parentId: "kr1", name: "T", estimationHistory: [] }],
    });
    expect(badge.check(state)).toBe(true);
    expect(badge.check(makeState())).toBe(false);
  });

  it("key-master triggers on achieved KR", () => {
    const badge = builtinBadges.find((b) => b.id === "key-master")!;
    const state = makeState({
      keyResults: [{ id: "kr1", status: "achieved", parentId: "o1", name: "KR" }],
    });
    expect(badge.check(state)).toBe(true);
    expect(badge.check(makeState())).toBe(false);
  });
});

describe("loadCustomBadges", () => {
  const { mkdtemp, writeFile: fsWriteFile, mkdir: fsMkdir } = require("node:fs/promises");
  const { tmpdir } = require("node:os");
  const path = require("node:path");

  it("returns empty array when custom dir does not exist", async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), "custom-badge-"));
    const result = await loadCustomBadges(tmp);
    expect(result).toEqual([]);
  });

  it("loads valid custom badge module", async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), "custom-badge-"));
    const customDir = path.join(tmp, "badges", "custom");
    await fsMkdir(customDir, { recursive: true });
    await fsWriteFile(
      path.join(customDir, "my-badge.mjs"),
      `export default {
        id: "custom-test",
        name: "Custom Test",
        description: "A test badge",
        icon: "🧪",
        category: "custom",
        check: (state) => true,
      };`
    );
    const result = await loadCustomBadges(tmp);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("custom-test");
  });

  it("skips invalid badge modules gracefully", async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), "custom-badge-"));
    const customDir = path.join(tmp, "badges", "custom");
    await fsMkdir(customDir, { recursive: true });
    await fsWriteFile(
      path.join(customDir, "bad.mjs"),
      `export default { notABadge: true };`
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await loadCustomBadges(tmp);
    expect(result).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
