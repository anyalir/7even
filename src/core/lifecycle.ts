import { execSync } from "node:child_process";
import { listItems, moveItem, readItem } from "./storage.js";
import { getGitRoot } from "./git.js";

/** Guard against circular lifecycle triggers */
export let _lifecycleGuard = false;

/**
 * Check if all tasks under a KR are done.
 */
export async function checkKrTaskCompletion(
  sevenDir: string,
  krId: string
): Promise<{ allDone: boolean; total: number; done: number }> {
  const tasks = await listItems(sevenDir, "task");
  const krTasks = tasks.filter((t) => t.data.parentId === krId);
  const doneTasks = krTasks.filter((t) => t.data.status === "done");
  return {
    allDone: krTasks.length === 0 || doneTasks.length === krTasks.length,
    total: krTasks.length,
    done: doneTasks.length,
  };
}

/**
 * Run a measure script with security validation.
 * Only allows `npm run ...` or paths under `.7even/scripts/` or `./scripts/`.
 */
export async function runMeasureScript(
  script: string
): Promise<{ stdout: string; exitCode: number }> {
  const trimmed = script.trim();
  const isAllowed =
    trimmed.startsWith("npm run") ||
    trimmed.startsWith(".7even/scripts/") ||
    trimmed.startsWith("./scripts/");

  if (!isAllowed) {
    throw new Error(
      `Script not allowed: "${trimmed}". Must start with "npm run", ".7even/scripts/", or "./scripts/".`
    );
  }

  try {
    const stdout = execSync(trimmed, {
      encoding: "utf-8",
      timeout: 30000,
      cwd: getGitRoot(),
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout ?? "",
      exitCode: typeof err.status === "number" ? err.status : 1,
    };
  }
}

/**
 * Evaluate a KR: run measureScript if present, return recommendation.
 * Does NOT auto-transition — returns recommendation for agent to act on.
 */
export async function evaluateKr(
  sevenDir: string,
  krId: string,
  runner: (script: string) => Promise<{ stdout: string; exitCode: number }> = runMeasureScript
): Promise<{ status: "achieved" | "needs-breakdown"; scriptOutput?: string }> {
  const { data } = await readItem(sevenDir, krId);

  if (data.measureScript) {
    const result = await runner(data.measureScript);
    if (result.exitCode === 0) {
      return { status: "achieved", scriptOutput: result.stdout };
    }
    return { status: "needs-breakdown", scriptOutput: result.stdout };
  }

  // No measureScript — agent must interpret manually
  return { status: "needs-breakdown" };
}

/**
 * Check if all KRs under an objective are achieved.
 */
export async function checkObjectiveCompletion(
  sevenDir: string,
  objectiveId: string
): Promise<{ allAchieved: boolean; total: number; achieved: number }> {
  const krs = await listItems(sevenDir, "key-result");
  const objKrs = krs.filter((kr) => kr.data.parentId === objectiveId);
  const achievedKrs = objKrs.filter((kr) => kr.data.status === "achieved");
  return {
    allAchieved: objKrs.length === 0 || achievedKrs.length === objKrs.length,
    total: objKrs.length,
    achieved: achievedKrs.length,
  };
}

/**
 * Cascade achievement: move KR to achieved, optionally move objective too.
 */
export async function cascadeAchievement(
  sevenDir: string,
  krId: string
): Promise<{
  krMoved: boolean;
  objectiveMoved: boolean;
  objectiveId?: string;
}> {
  if (_lifecycleGuard) {
    return { krMoved: false, objectiveMoved: false };
  }

  _lifecycleGuard = true;
  try {
    await moveItem(sevenDir, krId, "achieved");

    const { data: krData } = await readItem(sevenDir, krId);
    const objectiveId = krData.parentId;

    if (!objectiveId) {
      return { krMoved: true, objectiveMoved: false };
    }

    const completion = await checkObjectiveCompletion(sevenDir, objectiveId);
    if (completion.allAchieved) {
      await moveItem(sevenDir, objectiveId, "achieved");
      return { krMoved: true, objectiveMoved: true, objectiveId };
    }

    return { krMoved: true, objectiveMoved: false, objectiveId };
  } finally {
    _lifecycleGuard = false;
  }
}
