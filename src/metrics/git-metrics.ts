import { execSync } from "node:child_process";

export type CommitMetrics = {
  totalCommits: number;
  frequency: Array<{ date: string; count: number }>;
  totalAdditions: number;
  totalDeletions: number;
};

export type PrMetrics = {
  mergeCommits: number;
  totalWeight: number;
};

type ExecFn = (cmd: string, opts?: Record<string, unknown>) => string;

function defaultExec(cmd: string, opts?: Record<string, unknown>): string {
  return execSync(cmd, { encoding: "utf-8", ...opts }).trim();
}

export function getCommitMetrics(
  taskId: string,
  gitRoot?: string,
  exec: ExecFn = defaultExec
): CommitMetrics {
  const cwd = gitRoot ? { cwd: gitRoot } : {};

  // Get commits matching this task
  let output: string;
  try {
    output = exec(
      `git log --all --grep="task: ${taskId}" --format="%H|%aI|%s"`,
      cwd
    );
  } catch {
    output = "";
  }

  if (!output) {
    return { totalCommits: 0, frequency: [], totalAdditions: 0, totalDeletions: 0 };
  }

  const lines = output.split("\n").filter(Boolean);
  const commits = lines.map((line) => {
    const [hash, date, ...rest] = line.split("|");
    return { hash, date: date.slice(0, 10), message: rest.join("|") };
  });

  // Frequency by date
  const freqMap = new Map<string, number>();
  for (const c of commits) {
    freqMap.set(c.date, (freqMap.get(c.date) ?? 0) + 1);
  }
  const frequency = [...freqMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Additions/deletions per commit
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const c of commits) {
    try {
      const stat = exec(`git show --stat ${c.hash}`, cwd);
      const match = stat.match(
        /(\d+)\s+insertion[s]?\(\+\)(?:,\s*(\d+)\s+deletion)?/
      );
      if (match) {
        totalAdditions += parseInt(match[1], 10);
        totalDeletions += parseInt(match[2] ?? "0", 10);
      }
    } catch {
      // skip
    }
  }

  return { totalCommits: commits.length, frequency, totalAdditions, totalDeletions };
}

export function getPrMetrics(
  taskId: string,
  gitRoot?: string,
  exec: ExecFn = defaultExec
): PrMetrics {
  const cwd = gitRoot ? { cwd: gitRoot } : {};

  let output: string;
  try {
    output = exec(
      `git log --merges --grep="task: ${taskId}" --numstat --format=""`,
      cwd
    );
  } catch {
    output = "";
  }

  if (!output) {
    return { mergeCommits: 0, totalWeight: 0 };
  }

  const lines = output.split("\n").filter(Boolean);
  let totalWeight = 0;
  let mergeCommits = 0;

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length >= 2) {
      const additions = parseInt(parts[0], 10) || 0;
      const deletions = parseInt(parts[1], 10) || 0;
      totalWeight += additions + deletions;
      mergeCommits++;
    }
  }

  return { mergeCommits, totalWeight };
}
