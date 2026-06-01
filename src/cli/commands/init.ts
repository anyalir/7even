import { Command } from "commander";
import { resolveSevenDir, initSevenDir } from "../../core/storage.js";
import chalk from "chalk";
import { mkdir, readdir, symlink, lstat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function symlinkOpenCodeCommands(sevenDir: string) {
  // Package commands source: <pkg-root>/.opencode/commands/
  // __dirname is dist/ in compiled output, src/cli/commands/ in source
  // Use require.resolve or walk up to find .opencode/commands/
  const __dir = dirname(fileURLToPath(import.meta.url));
  let pkgRoot = __dir;
  // Walk up until we find .opencode/commands/ or hit root
  for (let i = 0; i < 5; i++) {
    const candidate = join(pkgRoot, ".opencode", "commands");
    try {
      await readdir(candidate);
      break;
    } catch {
      pkgRoot = dirname(pkgRoot);
    }
  }
  const srcDir = join(pkgRoot, ".opencode", "commands");
  const gitRoot = dirname(sevenDir);
  const destDir = join(gitRoot, ".opencode", "commands");

  let files: string[];
  try {
    files = await readdir(srcDir);
  } catch {
    console.error(chalk.yellow("Could not find 7even OpenCode commands to symlink."));
    return;
  }

  const commandFiles = files.filter((f) => f.startsWith("7-") && f.endsWith(".md"));
  if (commandFiles.length === 0) return;

  await mkdir(destDir, { recursive: true });

  let linked = 0;
  for (const file of commandFiles) {
    const dest = join(destDir, file);
    const src = join(srcDir, file);
    try {
      const stat = await lstat(dest).catch(() => null);
      if (stat) continue; // already exists
      await symlink(src, dest);
      linked++;
    } catch (err: any) {
      console.error(chalk.yellow(`Could not symlink ${file}: ${err.message}`));
    }
  }

  if (linked > 0) {
    console.log(chalk.green(`Symlinked ${linked} OpenCode slash commands to .opencode/commands/`));
  } else {
    console.log(chalk.dim("OpenCode slash commands already present."));
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
        await symlinkOpenCodeCommands(sevenDir);
      } catch (err: any) {
        if (err.message?.includes("already exists")) {
          console.error(chalk.yellow("Already initialized"));
          // Still symlink commands even if .7even/ exists
          const sevenDir = await resolveSevenDir();
          await symlinkOpenCodeCommands(sevenDir);
          process.exitCode = 1;
        } else {
          console.error(chalk.red(err.message));
          process.exitCode = 1;
        }
      }
    });
}
