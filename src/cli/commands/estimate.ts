import { Command } from "commander";
import { resolveSevenDir, readItem } from "../../core/storage.js";
import {
  addEstimation,
  getLatestEstimate,
  suggestReEstimate,
} from "../../core/estimation.js";
import { getGitAuthor } from "../../core/git.js";
import chalk from "chalk";

export function makeEstimateCommand(): Command {
  const cmd = new Command("estimate")
    .alias("est")
    .description("Manage task estimations");

  cmd
    .command("add <task-id> <sp>")
    .description("Add a story point estimation")
    .option("-e, --estimator <name>", "Estimator name (defaults to git author)")
    .action(async (taskId: string, sp: string, opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const spNum = Number(sp);
        if (isNaN(spNum) || spNum < 0) {
          throw new Error(`Invalid story points: "${sp}"`);
        }
        const estimator =
          opts.estimator ?? `${getGitAuthor().name} <${getGitAuthor().email}>`;
        await addEstimation(sevenDir, taskId, spNum, estimator);
        console.log(chalk.green(`Estimation added: ${spNum} SP for ${taskId.slice(0, 8)}`));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("show <task-id>")
    .description("Show estimation history for a task")
    .action(async (taskId: string) => {
      try {
        const sevenDir = await resolveSevenDir();
        const { data } = await readItem(sevenDir, taskId);
        const history = data.estimationHistory ?? [];
        if (history.length === 0) {
          console.log(chalk.dim("No estimations recorded."));
          return;
        }
        console.log(chalk.bold(`Estimation History (${taskId.slice(0, 8)}):`));
        console.log(
          chalk.dim("  Date                          SP    Estimator")
        );
        for (const est of history) {
          console.log(
            `  ${est.date}  ${String(est.spRemaining).padStart(4)}    ${est.estimator}`
          );
        }
        const latest = getLatestEstimate(data as any);
        if (latest) {
          console.log(chalk.bold(`\n  Current: ${latest.spRemaining} SP`));
        }
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("suggest <task-id>")
    .description("Get a suggested re-estimation")
    .action(async (taskId: string) => {
      try {
        const sevenDir = await resolveSevenDir();
        const { data } = await readItem(sevenDir, taskId);
        const suggestion = suggestReEstimate(data as any);
        console.log(chalk.bold(`Suggested: ${suggestion.suggestedSp} SP`));
        console.log(chalk.dim(`Rationale: ${suggestion.rationale}`));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  return cmd;
}
