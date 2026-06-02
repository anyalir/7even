import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import {
  initSevenDir,
  createItem,
  readItem,
  checkTaskAutoTransitions,
} from "../storage.js";

// Mock only the git functions that need mocking
vi.mock("../git.js", async () => {
  const actual = (await vi.importActual("../git.js")) as any;
  return {
    ...actual,
    getGitRoot: vi.fn(() => process.cwd()),
    getGitAuthor: vi.fn(() => ({ name: "Test User", email: "test@example.com" })),
  };
});

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

describe("git-based task transitions", () => {
  let sevenDir: string;
  let repoRoot: string;

  beforeEach(async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "7even-git-"));
    repoRoot = tempDir;
    sevenDir = join(tempDir, ".7even");
    
    // Initialize git repo
    execSync("git init", { cwd: repoRoot, encoding: "utf-8" });
    execSync("git config user.email 'test@example.com'", { cwd: repoRoot });
    execSync("git config user.name 'Test User'", { cwd: repoRoot });
    
    await initSevenDir(sevenDir);
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  it("auto-transitions task from to-do to in-progress when referenced in commit", async () => {
    // Create objective, KR, and task
    const objData = makeObjective();
    const objId = await createItem(sevenDir, "objective", "test-obj", objData);

    const krData = makeKeyResult({ parentId: objId });
    const krId = await createItem(sevenDir, "key-result", "test-kr", krData, objId);

    const taskData = makeTask({ parentId: krId, status: "to-do" });
    const taskId = await createItem(sevenDir, "task", "test-task", taskData, krId);

    // Verify task is to-do
    let task = await readItem(sevenDir, taskId);
    expect(task.data.status).toBe("to-do");

    // Create a commit referencing the task
    execSync(`git add .`, { cwd: repoRoot });
    execSync(`git commit -m "Work on feature" -m "task: ${taskId}"`, {
      cwd: repoRoot,
    });

    // Run auto-transition check
    const count = await checkTaskAutoTransitions(sevenDir);
    expect(count).toBe(1);

    // Verify task transitioned to in-progress
    task = await readItem(sevenDir, taskId);
    expect(task.data.status).toBe("in-progress");
  });

  it("supports multiple task references in single commit", async () => {
    // Create objective and KR
    const objData = makeObjective();
    const objId = await createItem(sevenDir, "objective", "multi-obj", objData);

    const krData = makeKeyResult({ parentId: objId });
    const krId = await createItem(sevenDir, "key-result", "multi-kr", krData, objId);

    // Create three to-do tasks
    const task1Data = makeTask({ parentId: krId, status: "to-do" });
    const task1Id = await createItem(sevenDir, "task", "task-1", task1Data, krId);

    const task2Data = makeTask({ parentId: krId, status: "to-do" });
    const task2Id = await createItem(sevenDir, "task", "task-2", task2Data, krId);

    const task3Data = makeTask({ parentId: krId, status: "to-do" });
    const task3Id = await createItem(sevenDir, "task", "task-3", task3Data, krId);

    // Commit referencing two tasks
    execSync(`git add .`, { cwd: repoRoot });
    execSync(
      `git commit -m "Implement features" -m "task: ${task1Id}" -m "task: ${task2Id}"`,
      { cwd: repoRoot }
    );

    // Run auto-transition
    const count = await checkTaskAutoTransitions(sevenDir);
    expect(count).toBe(2);

    // Verify task1 and task2 transitioned, task3 did not
    const task1 = await readItem(sevenDir, task1Id);
    expect(task1.data.status).toBe("in-progress");

    const task2 = await readItem(sevenDir, task2Id);
    expect(task2.data.status).toBe("in-progress");

    const task3 = await readItem(sevenDir, task3Id);
    expect(task3.data.status).toBe("to-do");
  });

  it("does not transition tasks already in-progress or done", async () => {
    // Create objective and KR
    const objData = makeObjective();
    const objId = await createItem(sevenDir, "objective", "status-obj", objData);

    const krData = makeKeyResult({ parentId: objId });
    const krId = await createItem(sevenDir, "key-result", "status-kr", krData, objId);

    // Create tasks in different states
    const todoTask = makeTask({ parentId: krId, status: "to-do" });
    const todoId = await createItem(sevenDir, "task", "todo-task", todoTask, krId);

    const inProgressTask = makeTask({ parentId: krId, status: "in-progress" });
    const inProgressId = await createItem(sevenDir, "task", "progress-task", inProgressTask, krId);

    const doneTask = makeTask({ parentId: krId, status: "done" });
    const doneId = await createItem(sevenDir, "task", "done-task", doneTask, krId);

    // Commit referencing all three
    execSync(`git add .`, { cwd: repoRoot });
    execSync(
      `git commit -m "Work" -m "task: ${todoId}" -m "task: ${inProgressId}" -m "task: ${doneId}"`,
      { cwd: repoRoot }
    );

    // Run auto-transition
    const count = await checkTaskAutoTransitions(sevenDir);
    expect(count).toBe(1); // Only to-do task should transition

    // Verify only to-do task transitioned
    const todo = await readItem(sevenDir, todoId);
    expect(todo.data.status).toBe("in-progress");

    const progress = await readItem(sevenDir, inProgressId);
    expect(progress.data.status).toBe("in-progress");

    const done = await readItem(sevenDir, doneId);
    expect(done.data.status).toBe("done");
  });

  it("returns 0 if no tasks to transition", async () => {
    // Create objective, KR, task but don't commit anything referencing it
    const objData = makeObjective();
    const objId = await createItem(sevenDir, "objective", "empty-obj", objData);

    const krData = makeKeyResult({ parentId: objId });
    const krId = await createItem(sevenDir, "key-result", "empty-kr", krData, objId);

    const taskData = makeTask({ parentId: krId, status: "to-do" });
    await createItem(sevenDir, "task", "empty-task", taskData, krId);

    // Commit without task reference
    execSync(`git add .`, { cwd: repoRoot });
    execSync(`git commit -m "Setup"`, { cwd: repoRoot });

    // Run auto-transition
    const count = await checkTaskAutoTransitions(sevenDir);
    expect(count).toBe(0);
  });
});
