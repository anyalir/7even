import { Command } from "commander";
import { resolveSevenDir } from "../../core/storage.js";
import { casCommit } from "../../core/git.js";
import chalk from "chalk";

export function makeCommitCommand(): Command {
  return new Command("commit")
    .description("Commit .7even/ changes with auto-generated message")
    .action(async () => {
      try {
        const sevenDir = await resolveSevenDir();
        console.log(chalk.dim("Committing .7even/ changes..."));
        const success = await casCommit(sevenDir);
        if (success) {
          console.log(chalk.green("Committed successfully."));
        } else {
          console.error(chalk.red("Commit failed after retries. Resolve manually."));
          process.exitCode = 1;
        }
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });
}
