import { Command } from "commander";
import { resolveSevenDir, checkTaskAutoTransitions } from "../../core/storage.js";
import chalk from "chalk";

export function makeSyncCommand(): Command {
  return new Command("sync")
    .description("Sync task states based on git commits (auto-transition to-do → in-progress)")
    .action(async () => {
      try {
        const sevenDir = await resolveSevenDir();
        const count = await checkTaskAutoTransitions(sevenDir);
        
        if (count === 0) {
          console.log(chalk.dim("No tasks to transition. All to-do tasks without commits."));
        } else {
          console.log(chalk.green(`✓ Transitioned ${count} task(s) to in-progress based on commits`));
        }
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });
}
