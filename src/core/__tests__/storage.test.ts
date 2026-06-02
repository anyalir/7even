import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  initSevenDir,
  createItem,
  readItem,
  updateItem,
  moveItem,
  addComment,
} from "../storage.js";
import { readIndex } from "../index-manager.js";

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
    schemaVersion: 1,
    parentId: null,
    comments: [],
    resultMeasure: "",
    goalParameters: {},
    estimationHistory: [],
    children: [],
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
    ...overrides,
  };
}

describe("storage", () => {
  let sevenDir: string;

  beforeEach(async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "7even-storage-"));
    sevenDir = join(tempDir, ".7even");
    await initSevenDir(sevenDir);
  });

  afterEach(async () => {
    const parent = join(sevenDir, "..");
    await rm(parent, { recursive: true, force: true });
  });

  it("initSevenDir creates directory and empty index", async () => {
    const index = await readIndex(sevenDir);
    expect(index).toEqual({});
  });

  it("initSevenDir throws if already exists", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "7even-dup-"));
    const dir = join(tempDir, ".7even");
    await initSevenDir(dir);
    await expect(initSevenDir(dir)).rejects.toThrow("already exists");
    await rm(tempDir, { recursive: true, force: true });
  });

  it("createItem writes valid JSON with correct schema fields", async () => {
    const data = makeObjective();
    const id = await createItem(sevenDir, "objective", "test-obj", data);
    expect(id).toBe(data.id);

    const { data: read } = await readItem(sevenDir, id);
    expect(read.description).toBe("Test objective");
    expect(read.status).toBe("proposed");
  });

  it("createItem places file in correct status directory", async () => {
    const data = makeObjective();
    await createItem(sevenDir, "objective", "my-obj", data);
    const index = await readIndex(sevenDir);
    expect(index[data.id]).toBe("proposed/my-obj/objective.json");
  });

  it("readItem retrieves and validates stored item", async () => {
    const data = makeObjective({ description: "Read test" });
    const id = await createItem(sevenDir, "objective", "read-obj", data);
    const { data: read } = await readItem(sevenDir, id);
    expect(read.description).toBe("Read test");
    expect(read.id).toBe(id);
  });

  it("updateItem merges fields correctly", async () => {
    const data = makeObjective({ description: "Before" });
    const id = await createItem(sevenDir, "objective", "upd-obj", data);
    await updateItem(sevenDir, id, { description: "After" });
    const { data: read } = await readItem(sevenDir, id);
    expect(read.description).toBe("After");
  });

  it("moveItem relocates file and updates index for tasks", async () => {
    // Create objective first as parent
    const objData = makeObjective();
    const objId = await createItem(sevenDir, "objective", "parent-obj", objData);

    // Create KR under objective
    const krData = makeKeyResult({ parentId: objId });
    const krId = await createItem(sevenDir, "key-result", "parent-kr", krData, objId);

    // Create task under KR
    const taskData = makeTask({ parentId: krId });
    const taskId = await createItem(sevenDir, "task", "my-task", taskData, krId);

    // Move task
    await moveItem(sevenDir, taskId, "in-progress");
    const { data: moved } = await readItem(sevenDir, taskId);
    expect(moved.status).toBe("in-progress");

    const index = await readIndex(sevenDir);
    expect(index[taskId]).toContain("in-progress");
  });

  it("moveItem for objective moves entire subtree", async () => {
    const objData = makeObjective();
    const objId = await createItem(sevenDir, "objective", "tree-obj", objData);

    const krData = makeKeyResult({ parentId: objId });
    const krId = await createItem(sevenDir, "key-result", "tree-kr", krData, objId);

    const taskData = makeTask({ parentId: krId });
    const taskId = await createItem(sevenDir, "task", "tree-task", taskData, krId);

    // Move objective from proposed → accepted
    await moveItem(sevenDir, objId, "accepted");

    const index = await readIndex(sevenDir);
    // All paths should now be under accepted/
    expect(index[objId]).toContain("accepted/");
    expect(index[krId]).toContain("accepted/");
    expect(index[taskId]).toContain("accepted/");
  });

  it("addComment appends to comments array", async () => {
    const data = makeObjective();
    const id = await createItem(sevenDir, "objective", "comment-obj", data);
    await addComment(sevenDir, id, "Test comment", "human");
    const { data: read } = await readItem(sevenDir, id);
    expect(read.comments).toHaveLength(1);
    expect(read.comments[0].text).toBe("Test comment");
    expect(read.comments[0].type).toBe("human");
    expect(read.comments[0].author).toContain("Test User");
  });

  it("slug collision appends -2, -3 suffix for tasks", async () => {
    const objData = makeObjective();
    const objId = await createItem(sevenDir, "objective", "slug-obj", objData);

    const krData = makeKeyResult({ parentId: objId });
    const krId = await createItem(sevenDir, "key-result", "slug-kr", krData, objId);

    const task1 = makeTask({ parentId: krId });
    await createItem(sevenDir, "task", "same-name", task1, krId);

    const task2 = makeTask({ parentId: krId });
    await createItem(sevenDir, "task", "same-name", task2, krId);

    const index = await readIndex(sevenDir);
    const paths = Object.values(index);
    const taskPaths = paths.filter((p) => p.includes("same-name"));
    expect(taskPaths).toHaveLength(2);
    expect(taskPaths.some((p) => p.includes("same-name.json"))).toBe(true);
    expect(taskPaths.some((p) => p.includes("same-name-2.json"))).toBe(true);
  });

  it("auto-transitions objective from proposed to accepted when first KR created", async () => {
    // Create objective in proposed status
    const objData = makeObjective({ status: "proposed" });
    const objId = await createItem(sevenDir, "objective", "auto-obj", objData);

    // Verify it's proposed
    let obj = await readItem(sevenDir, objId);
    expect(obj.data.status).toBe("proposed");

    // Create first KR
    const krData = makeKeyResult({ parentId: objId });
    await createItem(sevenDir, "key-result", "auto-kr", krData, objId);

    // Verify objective auto-transitioned to accepted
    obj = await readItem(sevenDir, objId);
    expect(obj.data.status).toBe("accepted");
    expect(obj.path).toContain("accepted/");
  });

  it("auto-transitions objective from accepted to achieved when all tasks done", async () => {
    // Create objective (will start proposed)
    const objData = makeObjective({ status: "proposed" });
    const objId = await createItem(sevenDir, "objective", "achieve-obj", objData);

    // Create KR (will auto-transition objective to accepted)
    const krData = makeKeyResult({ parentId: objId });
    const krId = await createItem(sevenDir, "key-result", "achieve-kr", krData, objId);

    // Create two tasks
    const task1Data = makeTask({ parentId: krId, status: "to-do" });
    const task1Id = await createItem(sevenDir, "task", "task-1", task1Data, krId);

    const task2Data = makeTask({ parentId: krId, status: "to-do" });
    const task2Id = await createItem(sevenDir, "task", "task-2", task2Data, krId);

    // Verify objective is accepted
    let obj = await readItem(sevenDir, objId);
    expect(obj.data.status).toBe("accepted");

    // Mark first task done
    await moveItem(sevenDir, task1Id, "done");
    obj = await readItem(sevenDir, objId);
    expect(obj.data.status).toBe("accepted"); // Still accepted, not all done

    // Mark second task done
    await moveItem(sevenDir, task2Id, "done");

    // Verify objective auto-transitioned to achieved
    obj = await readItem(sevenDir, objId);
    expect(obj.data.status).toBe("achieved");
    expect(obj.path).toContain("achieved/");
  });

  it("does not auto-transition to achieved if KR has no tasks", async () => {
    // Create objective and KR
    const objData = makeObjective({ status: "proposed" });
    const objId = await createItem(sevenDir, "objective", "no-tasks-obj", objData);

    const krData = makeKeyResult({ parentId: objId });
    await createItem(sevenDir, "key-result", "no-tasks-kr", krData, objId);

    // Verify objective is accepted (from KR creation) but not achieved
    const obj = await readItem(sevenDir, objId);
    expect(obj.data.status).toBe("accepted");
    expect(obj.path).toContain("accepted/");
  });

  it("auto-transitions with multiple KRs when all tasks done", async () => {
    // Create objective
    const objData = makeObjective({ status: "proposed" });
    const objId = await createItem(sevenDir, "objective", "multi-kr-obj", objData);

    // Create KR1 with 1 task
    const kr1Data = makeKeyResult({ parentId: objId });
    const kr1Id = await createItem(sevenDir, "key-result", "kr-1", kr1Data, objId);
    const task1Data = makeTask({ parentId: kr1Id, status: "to-do" });
    const task1Id = await createItem(sevenDir, "task", "task-1", task1Data, kr1Id);

    // Create KR2 with 1 task
    const kr2Data = makeKeyResult({ parentId: objId });
    const kr2Id = await createItem(sevenDir, "key-result", "kr-2", kr2Data, objId);
    const task2Data = makeTask({ parentId: kr2Id, status: "to-do" });
    const task2Id = await createItem(sevenDir, "task", "task-2", task2Data, kr2Id);

    // Verify accepted
    let obj = await readItem(sevenDir, objId);
    expect(obj.data.status).toBe("accepted");

    // Mark KR1's task done
    await moveItem(sevenDir, task1Id, "done");
    obj = await readItem(sevenDir, objId);
    expect(obj.data.status).toBe("accepted"); // Still accepted

    // Mark KR2's task done
    await moveItem(sevenDir, task2Id, "done");

    // Now should be achieved
    obj = await readItem(sevenDir, objId);
    expect(obj.data.status).toBe("achieved");
  });
});
