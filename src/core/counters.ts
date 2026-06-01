import { readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";

const COUNTERS_FILE = "counters.json";

interface Counters {
  objective: number;
  /** Map of parent shortId (e.g. "O1") to next child number */
  krCounters: Record<string, number>;
  taskCounters: Record<string, number>;
}

async function readCounters(sevenDir: string): Promise<Counters> {
  try {
    const raw = await readFile(join(sevenDir, COUNTERS_FILE), "utf-8");
    return JSON.parse(raw) as Counters;
  } catch {
    return { objective: 0, krCounters: {}, taskCounters: {} };
  }
}

async function writeCounters(
  sevenDir: string,
  counters: Counters
): Promise<void> {
  const p = join(sevenDir, COUNTERS_FILE);
  const tmp = p + ".tmp";
  await writeFile(tmp, JSON.stringify(counters, null, 2) + "\n", "utf-8");
  await rename(tmp, p);
}

/**
 * Generate a hierarchical shortId for a new item.
 *
 * Objectives: O1, O2, O3...
 * Key Results: O1KR1, O1KR2, O2KR1...
 * Tasks: O1KR1T1, O1KR1T2, O2KR3T1...
 */
export async function generateShortId(
  sevenDir: string,
  itemType: "objective" | "key-result" | "task",
  parentShortId?: string
): Promise<string> {
  const counters = await readCounters(sevenDir);

  let shortId: string;

  if (itemType === "objective") {
    counters.objective++;
    shortId = `O${counters.objective}`;
  } else if (itemType === "key-result") {
    const parent = parentShortId || "O0";
    counters.krCounters[parent] = (counters.krCounters[parent] || 0) + 1;
    shortId = `${parent}KR${counters.krCounters[parent]}`;
  } else {
    // task
    const parent = parentShortId || "KR0";
    counters.taskCounters[parent] = (counters.taskCounters[parent] || 0) + 1;
    shortId = `${parent}T${counters.taskCounters[parent]}`;
  }

  await writeCounters(sevenDir, counters);
  return shortId;
}
