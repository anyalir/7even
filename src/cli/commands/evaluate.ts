import { Command } from "commander";
import { resolveSevenDir, resolveId } from "../../core/storage.js";
import {
  checkKrTaskCompletion,
  evaluateKr,
  cascadeAchievement,
  checkObjectiveCompletion,
} from "../../core/lifecycle.js";
import chalk from "chalk";

export function makeEvaluateCommand(): Command {
  const cmd = new Command("evaluate")
    .alias("eval")
    .description("Evaluate key result or objective completion");

  cmd
    .command("kr <kr-id>")
    .description("Evaluate a key result")
    .option("--auto", "Auto-cascade achievement without prompting")
    .action(async (krId: string, opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, krId);

        // Check task completion first
        const completion = await checkKrTaskCompletion(sevenDir, resolvedId);
        console.log(
          chalk.bold(`Tasks: ${completion.done}/${completion.total} done`)
        );

        if (!completion.allDone) {
          console.log(
            chalk.yellow(
              `Not all tasks complete (${completion.total - completion.done} remaining). Cannot evaluate.`
            )
          );
          process.exitCode = 1;
          return;
        }

        // Run evaluation
        const result = await evaluateKr(sevenDir, resolvedId);
        console.log(chalk.bold(`Evaluation: ${result.status}`));
        if (result.scriptOutput) {
          console.log(chalk.dim(`Script output:\n${result.scriptOutput}`));
        }

        if (result.status === "achieved") {
          if (opts.auto) {
            const cascade = await cascadeAchievement(sevenDir, resolvedId);
            console.log(chalk.green(`KR moved to achieved: ${cascade.krMoved}`));
            if (cascade.objectiveMoved) {
              console.log(
                chalk.green(`Objective ${cascade.objectiveId} also achieved!`)
              );
            }
          } else {
            console.log(
              chalk.yellow(
                "KR met criteria. Run with --auto to cascade, or cascade manually."
              )
            );
          }
        } else {
          console.log(
            chalk.yellow("KR needs further breakdown or work.")
          );
        }
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("objective <objective-id>")
    .description("Check objective completion status")
    .action(async (objectiveId: string) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, objectiveId);
        const completion = await checkObjectiveCompletion(
          sevenDir,
          resolvedId
        );
        console.log(
          chalk.bold(
            `KRs: ${completion.achieved}/${completion.total} achieved`
          )
        );
        if (completion.allAchieved) {
          console.log(chalk.green("All KRs achieved! Objective complete."));
        } else {
          console.log(
            chalk.yellow(
              `${completion.total - completion.achieved} KR(s) remaining.`
            )
          );
        }
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  return cmd;
}
