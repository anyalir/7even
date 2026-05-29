import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initSevenDir, createItem } from "../storage.js";
import {
  checkKrTaskCompletion,
  runMeasureScript,
  evaluateKr,
  checkObjectiveCompletion,
  cascadeAchievement,
} from "../lifecycle.js";

// Mock git operations
vi.mock("../git.js", () => ({
  getGitRoot: () => "/tmp/fake-repo",
  getGitAuthor: () => ({ name: "Test User", email: "test@example.com" }),
  getChangeSummary: async () => "7even: test",
  casCommit: async () => true,
}));

function makeObjective(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    status: "proposed",
    createdAt: new Date().toISOString(),
    createdBy: "test@example.com",
    description: "Test objective",
    schemaVersion: 1,
    parentId: null,
    comments: [],
    statusQuo: "",
    constraints: "",
    functionalRequirements: "",
    nonfunctionalRequirements: "",
    desiredOutcome: "",
    children: [],
    ...overrides,
  };
}

function makeKeyResult(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    status: "aspirational",
    createdAt: new Date().toISOString(),
    createdBy: "test@example.com",
    description: "Test key result",
    schemaVersion: 2,
    parentId: null,
    comments: [],
    resultMeasure: "",
    goalParameters: {},
    estimationHistory: [],
    children: [],
    structuredMeasurement: null,
    measureScript: null,
    ...overrides,
  };
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    status: "to-do",
    createdAt: new Date().toISOString(),
    createdBy: "test@example.com",
    description: "Test task",
    schemaVersion: 1,
    parentId: null,
    comments: [],
    assignee: null,
    estimationHistory: [],
    acceptanceCriteria: [],
    ...overrides,
  };
}

describe("lifecycle", () => {
  let sevenDir: string;

  beforeEach(async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "7even-lifecycle-"));
    sevenDir = join(tempDir, ".7even");
    await initSevenDir(sevenDir);
  });

  afterEach(async () => {
    const parent = join(sevenDir, "..");
    await rm(parent, { recursive: true, force: true });
  });

  describe("checkKrTaskCompletion", () => {
    it("returns allDone when all tasks are done", async () => {
      const krId = crypto.randomUUID();
      const obj = makeObjective();
      await createItem(sevenDir, "objective", "obj-1", obj);
      const kr = makeKeyResult({ id: krId, parentId: obj.id });
      await createItem(sevenDir, "key-result", "kr-1", kr, obj.id);

      const t1 = makeTask({ status: "done", parentId: krId });
      const t2 = makeTask({ status: "done", parentId: krId });
      const t3 = makeTask({ status: "done", parentId: krId });
      await createItem(sevenDir, "task", "task-1", t1, krId);
      await createItem(sevenDir, "task", "task-2", t2, krId);
      await createItem(sevenDir, "task", "task-3", t3, krId);

      const result = await checkKrTaskCompletion(sevenDir, krId);
      expect(result).toEqual({ allDone: true, total: 3, done: 3 });
    });

    it("returns not allDone when some tasks pending", async () => {
      const krId = crypto.randomUUID();
      const obj = makeObjective();
      await createItem(sevenDir, "objective", "obj-1", obj);
      const kr = makeKeyResult({ id: krId, parentId: obj.id });
      await createItem(sevenDir, "key-result", "kr-1", kr, obj.id);

      const t1 = makeTask({ status: "done", parentId: krId });
      const t2 = makeTask({ status: "done", parentId: krId });
      const t3 = makeTask({ status: "to-do", parentId: krId });
      await createItem(sevenDir, "task", "task-1", t1, krId);
      await createItem(sevenDir, "task", "task-2", t2, krId);
      await createItem(sevenDir, "task", "task-3", t3, krId);

      const result = await checkKrTaskCompletion(sevenDir, krId);
      expect(result).toEqual({ allDone: false, total: 3, done: 2 });
    });

    it("returns allDone true when KR has no tasks", async () => {
      const krId = crypto.randomUUID();
      const result = await checkKrTaskCompletion(sevenDir, krId);
      expect(result).toEqual({ allDone: true, total: 0, done: 0 });
    });
  });

  describe("runMeasureScript", () => {
    it("rejects scripts that are not allowed", async () => {
      await expect(runMeasureScript("rm -rf /")).rejects.toThrow(
        "Script not allowed"
      );
      await expect(runMeasureScript("curl http://evil.com")).rejects.toThrow(
        "Script not allowed"
      );
    });

    it("accepts npm run scripts", async () => {
      // This will fail since no package.json at /tmp/fake-repo, but it should not throw validation error
      const result = await runMeasureScript("npm run nonexistent-script");
      expect(result.exitCode).not.toBe(0);
    });

    it("accepts .7even/scripts/ paths", async () => {
      // Will fail to execute but should pass validation
      const result = await runMeasureScript(".7even/scripts/check.sh");
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("evaluateKr", () => {
    it("returns needs-breakdown when no measureScript", async () => {
      const obj = makeObjective();
      await createItem(sevenDir, "objective", "obj-1", obj);
      const kr = makeKeyResult({ parentId: obj.id, measureScript: null });
      await createItem(sevenDir, "key-result", "kr-1", kr, obj.id);

      const result = await evaluateKr(sevenDir, kr.id);
      expect(result.status).toBe("needs-breakdown");
      expect(result.scriptOutput).toBeUndefined();
    });

    it("returns achieved when measureScript exits 0", async () => {
      const obj = makeObjective();
      await createItem(sevenDir, "objective", "obj-1", obj);
      const kr = makeKeyResult({
        parentId: obj.id,
        measureScript: "./scripts/check.sh",
      });
      await createItem(sevenDir, "key-result", "kr-1", kr, obj.id);

      const mockRunner = async () => ({ stdout: "pass", exitCode: 0 });
      const result = await evaluateKr(sevenDir, kr.id, mockRunner);
      expect(result.status).toBe("achieved");
      expect(result.scriptOutput).toBe("pass");
    });

    it("returns needs-breakdown when measureScript exits non-0", async () => {
      const obj = makeObjective();
      await createItem(sevenDir, "objective", "obj-1", obj);
      const kr = makeKeyResult({
        parentId: obj.id,
        measureScript: "./scripts/check.sh",
      });
      await createItem(sevenDir, "key-result", "kr-1", kr, obj.id);

      const mockRunner = async () => ({ stdout: "fail output", exitCode: 1 });
      const result = await evaluateKr(sevenDir, kr.id, mockRunner);
      expect(result.status).toBe("needs-breakdown");
      expect(result.scriptOutput).toBe("fail output");
    });
  });

  describe("checkObjectiveCompletion", () => {
    it("returns allAchieved when all KRs achieved", async () => {
      const obj = makeObjective({ status: "accepted" });
      await createItem(sevenDir, "objective", "obj-1", obj);

      const kr1 = makeKeyResult({
        status: "achieved",
        parentId: obj.id,
      });
      const kr2 = makeKeyResult({
        status: "achieved",
        parentId: obj.id,
      });
      await createItem(sevenDir, "key-result", "kr-1", kr1, obj.id);
      await createItem(sevenDir, "key-result", "kr-2", kr2, obj.id);

      const result = await checkObjectiveCompletion(sevenDir, obj.id);
      expect(result).toEqual({ allAchieved: true, total: 2, achieved: 2 });
    });

    it("returns not allAchieved when some KRs pending", async () => {
      const obj = makeObjective({ status: "accepted" });
      await createItem(sevenDir, "objective", "obj-1", obj);

      const kr1 = makeKeyResult({
        status: "achieved",
        parentId: obj.id,
      });
      const kr2 = makeKeyResult({
        status: "aspirational",
        parentId: obj.id,
      });
      await createItem(sevenDir, "key-result", "kr-1", kr1, obj.id);
      await createItem(sevenDir, "key-result", "kr-2", kr2, obj.id);

      const result = await checkObjectiveCompletion(sevenDir, obj.id);
      expect(result).toEqual({ allAchieved: false, total: 2, achieved: 1 });
    });
  });

  describe("cascadeAchievement", () => {
    it("moves KR but not objective when other KRs pending", async () => {
      const obj = makeObjective({ status: "accepted" });
      await createItem(sevenDir, "objective", "obj-1", obj);

      const kr1 = makeKeyResult({ parentId: obj.id });
      const kr2 = makeKeyResult({ parentId: obj.id });
      await createItem(sevenDir, "key-result", "kr-1", kr1, obj.id);
      await createItem(sevenDir, "key-result", "kr-2", kr2, obj.id);

      const result = await cascadeAchievement(sevenDir, kr1.id);
      expect(result.krMoved).toBe(true);
      expect(result.objectiveMoved).toBe(false);
    });

    it("moves both KR and objective when last KR achieved", async () => {
      const obj = makeObjective({ status: "accepted" });
      await createItem(sevenDir, "objective", "obj-1", obj);

      const kr1 = makeKeyResult({
        status: "achieved",
        parentId: obj.id,
      });
      const kr2 = makeKeyResult({ parentId: obj.id });
      await createItem(sevenDir, "key-result", "kr-1", kr1, obj.id);
      await createItem(sevenDir, "key-result", "kr-2", kr2, obj.id);

      const result = await cascadeAchievement(sevenDir, kr2.id);
      expect(result.krMoved).toBe(true);
      expect(result.objectiveMoved).toBe(true);
      expect(result.objectiveId).toBe(obj.id);
    });
  });
});
