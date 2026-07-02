import { Command } from "commander";
import { resolveSevenDir, initSevenDir } from "../../core/storage.js";
import chalk from "chalk";
import { mkdir, readdir, symlink, lstat, readlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function findPkgRoot(): Promise<string> {
  const __dir = dirname(fileURLToPath(import.meta.url));
  let pkgRoot = __dir;
  for (let i = 0; i < 5; i++) {
    const candidate = join(pkgRoot, ".opencode", "commands");
    try {
      await readdir(candidate);
      return pkgRoot;
    } catch {
      pkgRoot = dirname(pkgRoot);
    }
  }
  return __dir; // fallback
}

async function symlinkDir(
  srcDir: string,
  destDir: string,
  filter: (f: string) => boolean,
  label: string,
): Promise<void> {
  let files: string[];
  try {
    files = await readdir(srcDir);
  } catch {
    console.error(chalk.yellow(`Could not find 7even ${label} to symlink.`));
    return;
  }

  const targets = files.filter(filter);
  if (targets.length === 0) return;

  await mkdir(destDir, { recursive: true });

  let linked = 0;
  for (const file of targets) {
    const dest = join(destDir, file);
    const src = join(srcDir, file);
    try {
      const stat = await lstat(dest).catch(() => null);
      if (stat) continue;
      await symlink(src, dest);
      linked++;
    } catch (err: any) {
      console.error(chalk.yellow(`Could not symlink ${file}: ${err.message}`));
    }
  }

  if (linked > 0) {
    console.log(chalk.green(`Symlinked ${linked} ${label} to ${destDir.replace(dirname(destDir.replace(/\/$/, "")) + "/", "")}/`));
  } else {
    console.log(chalk.dim(`${label} already present.`));
  }
}

async function symlinkOpenCode(sevenDir: string) {
  const pkgRoot = await findPkgRoot();
  const gitRoot = dirname(sevenDir);

  // Slash commands
  await symlinkDir(
    join(pkgRoot, ".opencode", "commands"),
    join(gitRoot, ".opencode", "commands"),
    (f) => f.startsWith("7-") && f.endsWith(".md"),
    "OpenCode slash commands",
  );

  // Skill
  await symlinkDir(
    join(pkgRoot, ".opencode", "skills"),
    join(gitRoot, ".opencode", "skills"),
    (f) => f === "7even",
    "OpenCode skill",
  );

  // Agents (executor/validator subagents for spawn-pair)
  await symlinkDir(
    join(pkgRoot, ".opencode", "agents"),
    join(gitRoot, ".opencode", "agents"),
    (f) => f.startsWith("7-") && f.endsWith(".md"),
    "OpenCode agents",
  );
}

async function symlinkShortBin(sevenDir: string) {
  const gitRoot = dirname(sevenDir);
  const binDir = join(gitRoot, "node_modules", ".bin");
  const s7nBin = join(binDir, "s7n");
  const shortBin = join(binDir, "7");

  try {
    await lstat(s7nBin);
  } catch {
    return; // s7n not installed via npm, skip
  }

  try {
    const stat = await lstat(shortBin).catch(() => null);
    if (stat) return; // already exists
    // Use the known package structure path
    const target = join("..", "@anyalir", "7even", "dist", "index.js");
    await symlink(target, shortBin);
    console.log(chalk.green(`Created shortcut: npx 7 now works`));
  } catch (err: any) {
    // Non-fatal — just a convenience
    console.log(chalk.dim(`Could not create 'npx 7' shortcut: ${err.message}`));
  }
}

export function makeInitCommand(): Command {
  return new Command("init")
    .description("Initialize .7even/ directory in the current git repo")
    .action(async () => {
      try {
        const sevenDir = await resolveSevenDir();
        await initSevenDir(sevenDir);
        console.log(chalk.green(`Initialized .7even/ in ${sevenDir}`));
        await symlinkOpenCode(sevenDir);
        await symlinkShortBin(sevenDir);
      } catch (err: any) {
        if (err.message?.includes("already exists")) {
          console.error(chalk.yellow("Already initialized"));
          const sevenDir = await resolveSevenDir();
          await symlinkOpenCode(sevenDir);
          await symlinkShortBin(sevenDir);
          process.exitCode = 1;
        } else {
          console.error(chalk.red(err.message));
          process.exitCode = 1;
        }
      }
    });
}
