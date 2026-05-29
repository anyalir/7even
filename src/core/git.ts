import { execSync } from "node:child_process";

export function getGitRoot(): string {
  return execSync("git rev-parse --show-toplevel", {
    encoding: "utf-8",
  }).trim();
}

export function getGitAuthor(): { name: string; email: string } {
  try {
    const name = execSync("git config user.name", {
      encoding: "utf-8",
    }).trim();
    const email = execSync("git config user.email", {
      encoding: "utf-8",
    }).trim();
    if (!name || !email) {
      throw new Error("Git user.name or user.email not configured");
    }
    return { name, email };
  } catch {
    throw new Error(
      "Git user.name and user.email must be configured. Run:\n  git config user.name 'Your Name'\n  git config user.email 'you@example.com'"
    );
  }
}

export async function getChangeSummary(sevenDir: string): Promise<string> {
  try {
    const diff = execSync("git diff --cached --name-status -- .7even/", {
      encoding: "utf-8",
      cwd: sevenDir.replace(/\/.7even\/?$/, ""),
    }).trim();

    if (!diff) return "7even: update work items";

    const lines = diff.split("\n");
    const actions: string[] = [];

    for (const line of lines) {
      const [status, filePath] = line.split("\t");
      if (!filePath) continue;
      const slug = filePath
        .replace(/^\.7even\//, "")
        .replace(/\.json$/, "")
        .split("/")
        .pop();
      if (status === "A") actions.push(`create ${slug}`);
      else if (status === "M") actions.push(`update ${slug}`);
      else if (status === "D") actions.push(`remove ${slug}`);
      else if (status?.startsWith("R")) actions.push(`move ${slug}`);
    }

    if (actions.length === 0) return "7even: update work items";
    if (actions.length === 1) return `7even: ${actions[0]}`;
    return `7even: ${actions[0]} (+${actions.length - 1} more)`;
  } catch {
    return "7even: update work items";
  }
}

export async function casCommit(
  sevenDir: string,
  maxRetries = 3
): Promise<boolean> {
  const repoRoot = sevenDir.replace(/\/.7even\/?$/, "");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Stage .7even/
      execSync("git add .7even/", { cwd: repoRoot, encoding: "utf-8" });

      // Check if there's anything to commit
      const staged = execSync("git diff --cached --name-only -- .7even/", {
        cwd: repoRoot,
        encoding: "utf-8",
      }).trim();
      if (!staged) return true; // Nothing to commit

      // Generate commit message
      const summary = await getChangeSummary(sevenDir);

      // Get UUIDs from staged files for commit body
      const uuids: string[] = [];
      for (const file of staged.split("\n")) {
        if (file.endsWith(".json") && !file.endsWith("index.json")) {
          try {
            const { readFileSync } = await import("node:fs");
            const { join } = await import("node:path");
            const content = readFileSync(join(repoRoot, file), "utf-8");
            const data = JSON.parse(content);
            if (data.id) uuids.push(`task: ${data.id}`);
          } catch {
            // Skip
          }
        }
      }

      const body = uuids.length > 0 ? `\n\n${uuids.join("\n")}` : "";
      const message = summary + body;

      execSync(`git commit -m ${JSON.stringify(message)}`, {
        cwd: repoRoot,
        encoding: "utf-8",
      });

      // Pull --rebase and push
      try {
        execSync("git pull --rebase", { cwd: repoRoot, encoding: "utf-8" });
        execSync("git push", { cwd: repoRoot, encoding: "utf-8" });
      } catch {
        // No remote configured — that's fine for local-only repos
      }

      return true;
    } catch (err) {
      if (attempt < maxRetries) {
        console.error(
          `Conflict detected, retrying (${attempt}/${maxRetries})...`
        );
        try {
          execSync("git rebase --abort", {
            cwd: repoRoot,
            encoding: "utf-8",
            stdio: "ignore",
          });
        } catch {
          // No rebase in progress
        }
        execSync("git pull --rebase", { cwd: repoRoot, encoding: "utf-8" });
      } else {
        return false;
      }
    }
  }

  return false;
}
