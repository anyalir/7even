import { Command } from "commander";
import { resolveSevenDir } from "../../core/storage.js";
import { repairIndex } from "../../core/index-manager.js";
import chalk from "chalk";

export function makeRepairIndexCommand(): Command {
  return new Command("repair-index")
    .description("Rebuild index.json from filesystem")
    .option("--dry-run", "Show what would change without applying")
    .action(async (opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const result = await repairIndex(sevenDir, { dryRun: opts.dryRun });
        if (opts.dryRun) {
          console.log(chalk.yellow("Dry run — no changes applied:"));
        }
        console.log(`  Added: ${chalk.green(String(result.added.length))}`);
        console.log(`  Removed: ${chalk.red(String(result.removed.length))}`);
        console.log(`  Unchanged: ${chalk.dim(String(result.unchanged))}`);
        if (result.added.length > 0) {
          console.log(chalk.dim("\nAdded IDs:"));
          for (const id of result.added) console.log(`  + ${id}`);
        }
        if (result.removed.length > 0) {
          console.log(chalk.dim("\nRemoved IDs:"));
          for (const id of result.removed) console.log(`  - ${id}`);
        }
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });
}
