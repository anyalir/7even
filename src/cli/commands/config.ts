import { Command } from "commander";
import chalk from "chalk";
import { resolveSevenDir, getConfig, setConfig } from "../../core/storage.js";

export function makeConfigCommand(): Command {
  const cmd = new Command("config").description("Project configuration");

  cmd
    .command("show")
    .description("Show current configuration")
    .action(async () => {
      const sevenDir = await resolveSevenDir();
      const config = await getConfig(sevenDir);
      console.log(chalk.bold("Team size:"), config.teamSize);
      console.log(
        chalk.bold("Initial velocity:"),
        config.initialVelocity != null
          ? `${config.initialVelocity} SP/week`
          : chalk.dim("not set")
      );
    });

  cmd
    .command("set")
    .description("Update configuration")
    .option("--team-size <n>", "Number of team members", parseInt)
    .option(
      "--initial-velocity <sp>",
      "Estimated team velocity in SP/week (used when no historical data exists)",
      parseFloat
    )
    .action(async (opts) => {
      const sevenDir = await resolveSevenDir();
      const updates: Record<string, unknown> = {};
      if (opts.teamSize != null) updates.teamSize = opts.teamSize;
      if (opts.initialVelocity != null)
        updates.initialVelocity = opts.initialVelocity;

      if (Object.keys(updates).length === 0) {
        console.log(chalk.yellow("No options provided. Use --team-size or --initial-velocity."));
        return;
      }

      const config = await setConfig(sevenDir, updates);
      console.log(chalk.green("Configuration updated:"));
      console.log(chalk.bold("  Team size:"), config.teamSize);
      console.log(
        chalk.bold("  Initial velocity:"),
        config.initialVelocity != null
          ? `${config.initialVelocity} SP/week`
          : chalk.dim("not set")
      );
    });

  return cmd;
}
