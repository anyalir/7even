import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  initSevenDir,
  createItem,
  readItem,
} from "../storage.js";
import { addEstimation, getLatestEstimate, suggestReEstimate } from "../estimation.js";

vi.mock("../git.js", () => ({
  getGitRoot: () => "/tmp/fake-repo",
  getGitAuthor: () => ({ name: "Test User", email: "test@example.com" }),
  getChangeSummary: async () => "7even: test",
  casCommit: async () => true,
  getTaskCommits: () => [],
}));

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    status: "to-do",
    createdAt: new Date().toISOString(),
    createdBy: "test@example.com",
    description: "Test task",
    schemaVersion: 2,
    parentId: null,
    comments: [],
    assignee: null,
    estimationHistory: [],
    acceptanceCriteria: [],
    ...overrides,
  };
}

describe("addEstimation", () => {
  let sevenDir: string;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "est-test-"));
    sevenDir = join(tmpDir, ".7even");
    await initSevenDir(sevenDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("appends estimation entry to task", async () => {
    const task = makeTask();
    const id = await createItem(sevenDir, "task", "test-task", task);
    await addEstimation(sevenDir, id, 5, "alice@example.com");

    const { data } = await readItem(sevenDir, id);
    expect(data.estimationHistory).toHaveLength(1);
    expect(data.estimationHistory[0].spRemaining).toBe(5);
    expect(data.estimationHistory[0].estimator).toBe("alice@example.com");
  });

  it("preserves all entries (non-destructive)", async () => {
    const task = makeTask();
    const id = await createItem(sevenDir, "task", "test-task", task);
    await addEstimation(sevenDir, id, 5, "alice@example.com");
    await addEstimation(sevenDir, id, 3, "bob@example.com");
    await addEstimation(sevenDir, id, 1, "alice@example.com");

    const { data } = await readItem(sevenDir, id);
    expect(data.estimationHistory).toHaveLength(3);
    expect(data.estimationHistory[0].spRemaining).toBe(5);
    expect(data.estimationHistory[1].spRemaining).toBe(3);
    expect(data.estimationHistory[2].spRemaining).toBe(1);
  });
});

describe("getLatestEstimate", () => {
  it("returns latest entry by date", () => {
    const task = {
      estimationHistory: [
        { date: "2026-01-01T00:00:00Z", spRemaining: 5, estimator: "a" },
        { date: "2026-03-01T00:00:00Z", spRemaining: 2, estimator: "b" },
        { date: "2026-02-01T00:00:00Z", spRemaining: 3, estimator: "c" },
      ],
    };
    const latest = getLatestEstimate(task);
    expect(latest).not.toBeNull();
    expect(latest!.spRemaining).toBe(2);
    expect(latest!.estimator).toBe("b");
  });

  it("returns null for empty history", () => {
    expect(getLatestEstimate({ estimationHistory: [] })).toBeNull();
  });
});

describe("suggestReEstimate", () => {
  it("returns heuristic for task with no history", () => {
    const result = suggestReEstimate({
      description: "Short task",
      status: "to-do",
      estimationHistory: [],
    });
    expect(result.suggestedSp).toBe(1);
    expect(result.rationale).toContain("No prior estimates");
  });

  it("adjusts for in-progress tasks with history", () => {
    const result = suggestReEstimate({
      description: "Some task",
      status: "in-progress",
      estimationHistory: [
        { date: "2026-01-01T00:00:00Z", spRemaining: 10, estimator: "a" },
      ],
    });
    expect(result.suggestedSp).toBe(7); // 10 * 0.7
    expect(result.rationale).toContain("reduced");
  });

  it("keeps same SP for to-do tasks with history", () => {
    const result = suggestReEstimate({
      description: "Some task",
      status: "to-do",
      estimationHistory: [
        { date: "2026-01-01T00:00:00Z", spRemaining: 5, estimator: "a" },
      ],
    });
    expect(result.suggestedSp).toBe(5);
  });

  it("factors in acceptance criteria count", () => {
    const result = suggestReEstimate({
      description: "Short",
      status: "to-do",
      estimationHistory: [],
      acceptanceCriteria: [
        { text: "a" }, { text: "b" }, { text: "c" }, { text: "d" }, { text: "e" },
      ],
    });
    expect(result.suggestedSp).toBeGreaterThanOrEqual(5);
  });
});
