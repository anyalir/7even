import { Command } from "commander";
import { makeInitCommand } from "./commands/init.js";
import { makeObjectiveCommand } from "./commands/objective.js";
import { makeKeyResultCommand } from "./commands/key-result.js";
import { makeTaskCommand } from "./commands/task.js";
import { makeCommitCommand } from "./commands/commit.js";
import { makeRepairIndexCommand } from "./commands/repair-index.js";
import { makeSessionCommand } from "./commands/session.js";
import { makeEstimateCommand } from "./commands/estimate.js";
import { makeEvaluateCommand } from "./commands/evaluate.js";
import { makeDashboardCommand } from "./commands/dashboard.js";

const program = new Command();

program
  .name("7n")
  .description("7even work tracker")
  .version("0.1.0");

program.addCommand(makeInitCommand());
program.addCommand(makeObjectiveCommand());
program.addCommand(makeKeyResultCommand());
program.addCommand(makeTaskCommand());
program.addCommand(makeCommitCommand());
program.addCommand(makeRepairIndexCommand());
program.addCommand(makeSessionCommand());
program.addCommand(makeEstimateCommand());
program.addCommand(makeEvaluateCommand());
program.addCommand(makeDashboardCommand());

program.parse();
