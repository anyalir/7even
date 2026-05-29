import { Command } from "commander";
import { resolveSevenDir, initSevenDir } from "../../core/storage.js";
import chalk from "chalk";

export function makeInitCommand(): Command {
  return new Command("init")
    .description("Initialize .7even/ directory in the current git repo")
    .action(async () => {
      try {
        const sevenDir = await resolveSevenDir();
        await initSevenDir(sevenDir);
        console.log(chalk.green(`Initialized .7even/ in ${sevenDir}`));
      } catch (err: any) {
        if (err.message?.includes("already exists")) {
          console.error(chalk.yellow("Already initialized"));
          process.exitCode = 1;
        } else {
          console.error(chalk.red(err.message));
          process.exitCode = 1;
        }
      }
    });
}
