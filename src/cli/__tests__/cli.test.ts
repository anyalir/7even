import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { Command } from "commander";

// Import command makers
import { makeInitCommand } from "../commands/init.js";
import { makeObjectiveCommand } from "../commands/objective.js";
import { makeKeyResultCommand } from "../commands/key-result.js";
import { makeTaskCommand } from "../commands/task.js";
import { makeRepairIndexCommand } from "../commands/repair-index.js";

let tmpDir: string;
let originalCwd: string;

function createProgram(): Command {
  const program = new Command();
  program.name("7n").exitOverride();
  program.addCommand(makeInitCommand());
  program.addCommand(makeObjectiveCommand());
  program.addCommand(makeKeyResultCommand());
  program.addCommand(makeTaskCommand());
  program.addCommand(makeRepairIndexCommand());
  return program;
}

async function run(program: Command, args: string[]): Promise<void> {
  await program.parseAsync(["node", "7", ...args]);
}

describe("CLI E2E", () => {
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "7even-test-"));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    execSync("git init", { cwd: tmpDir, stdio: "ignore" });
    execSync("git config user.name 'Test User'", { cwd: tmpDir, stdio: "ignore" });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir, stdio: "ignore" });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("init creates .7even/ directory", async () => {
    const program = createProgram();
    await run(program, ["init"]);
    const indexRaw = await readFile(join(tmpDir, ".7even", "index.json"), "utf-8");
    expect(JSON.parse(indexRaw)).toEqual({});
  });

  it("full OKR hierarchy workflow", async () => {
    // Init
    let program = createProgram();
    await run(program, ["init"]);

    // Create objective
    program = createProgram();
    const consoleLogs: string[] = [];
    const origLog = console.log;
    console.log = (...args: any[]) => consoleLogs.push(args.join(" "));

    await run(program, ["objective", "create", "-d", "Test objective"]);
    
    // Extract objective ID from output
    const objIdLine = consoleLogs.find((l) => l.includes("ID:"));
    expect(objIdLine).toBeTruthy();
    const objId = objIdLine!.replace(/.*ID:\s*/, "").replace(/\x1b\[[0-9;]*m/g, "").trim().split(/\s+/)[0];

    // Show objective
    consoleLogs.length = 0;
    program = createProgram();
    await run(program, ["objective", "show", objId]);
    const showOutput = consoleLogs.join("\n");
    expect(showOutput).toContain("Test objective");

    // Create key result
    consoleLogs.length = 0;
    program = createProgram();
    await run(program, ["key-result", "create", "-d", "Test KR", "--parent", objId]);
    const krIdLine = consoleLogs.find((l) => l.includes("ID:"));
    expect(krIdLine).toBeTruthy();
    const krId = krIdLine!.replace(/.*ID:\s*/, "").replace(/\x1b\[[0-9;]*m/g, "").trim().split(/\s+/)[0];

    // Create task
    consoleLogs.length = 0;
    program = createProgram();
    await run(program, ["task", "create", "-d", "Test task", "--parent", krId]);
    const taskIdLine = consoleLogs.find((l) => l.includes("ID:"));
    expect(taskIdLine).toBeTruthy();
    const taskId = taskIdLine!.replace(/.*ID:\s*/, "").replace(/\x1b\[[0-9;]*m/g, "").trim().split(/\s+/)[0];

    // Move task to in-progress
    consoleLogs.length = 0;
    program = createProgram();
    await run(program, ["task", "move", taskId, "in-progress"]);
    expect(consoleLogs.join(" ")).toContain("in-progress");

    // Comment on task
    consoleLogs.length = 0;
    program = createProgram();
    await run(program, ["task", "comment", taskId, "-m", "test comment"]);
    expect(consoleLogs.join(" ")).toContain("Comment added");

    // Assign task
    consoleLogs.length = 0;
    program = createProgram();
    await run(program, ["task", "assign", taskId, "--email", "test@test.com"]);
    expect(consoleLogs.join(" ")).toContain("assigned");

    // Verify task show has assignee and comment
    consoleLogs.length = 0;
    program = createProgram();
    await run(program, ["task", "show", taskId]);
    const taskShow = consoleLogs.join("\n");
    expect(taskShow).toContain("test@test.com");
    expect(taskShow).toContain("test comment");

    // Repair index dry run
    consoleLogs.length = 0;
    program = createProgram();
    await run(program, ["repair-index", "--dry-run"]);
    // Should show 0 added, 0 removed (clean state)
    const repairOutput = consoleLogs.join("\n").replace(/\x1b\[[0-9;]*m/g, "");
    expect(repairOutput).toContain("Added: 0");
    expect(repairOutput).toContain("Removed: 0");

    console.log = origLog;
  });

  it("list objectives", async () => {
    let program = createProgram();
    await run(program, ["init"]);

    const origLog = console.log;
    const consoleLogs: string[] = [];
    console.log = (...args: any[]) => consoleLogs.push(args.join(" "));

    program = createProgram();
    await run(program, ["objective", "create", "-d", "Obj one"]);
    program = createProgram();
    await run(program, ["objective", "create", "-d", "Obj two"]);

    consoleLogs.length = 0;
    program = createProgram();
    await run(program, ["objective", "list"]);
    const listOutput = consoleLogs.join("\n");
    expect(listOutput).toContain("Obj one");
    expect(listOutput).toContain("Obj two");

    console.log = origLog;
  });
});
