import { Command } from "commander";
import { resolveSevenDir } from "../../core/storage.js";
import {
  createSession,
  loadSession,
  saveSession,
  listSessions,
} from "../../core/session-manager.js";
import chalk from "chalk";

export function makeSessionCommand(): Command {
  const cmd = new Command("session")
    .alias("s")
    .description("Manage OKR decomposition sessions");

  cmd
    .command("create <type> <target-id>")
    .description("Create a new session (objective-to-kr | kr-to-task)")
    .action(async (type: string, targetId: string) => {
      try {
        if (type !== "objective-to-kr" && type !== "kr-to-task") {
          throw new Error(
            `Invalid session type: "${type}". Must be "objective-to-kr" or "kr-to-task".`
          );
        }
        const sevenDir = await resolveSevenDir();
        const session = await createSession(sevenDir, type, targetId);
        console.log(chalk.green(`Created session: ${session.id}`));
        console.log(chalk.dim(`Type: ${session.type}`));
        console.log(chalk.dim(`Target: ${session.targetId}`));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("show <session-id>")
    .description("Show session details")
    .action(async (sessionId: string) => {
      try {
        const sevenDir = await resolveSevenDir();
        const session = await loadSession(sevenDir, sessionId);
        console.log(chalk.bold(`Session: ${session.id}`));
        console.log(`  Type:    ${session.type}`);
        console.log(`  Target:  ${session.targetId}`);
        console.log(`  Status:  ${statusColor(session.status)}`);
        console.log(`  Created: ${session.createdAt}`);
        console.log(`  Updated: ${session.updatedAt}`);
        if (session.proposals.length > 0) {
          console.log(chalk.bold(`\n  Proposals (${session.proposals.length}):`));
          for (const p of session.proposals) {
            console.log(`    - ${p.description ?? p.id ?? JSON.stringify(p)}`);
          }
        }
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("list")
    .description("List sessions")
    .option("-s, --status <status>", "Filter by status")
    .action(async (opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const sessions = await listSessions(sevenDir, opts.status);
        if (sessions.length === 0) {
          console.log(chalk.dim("No sessions found."));
          return;
        }
        for (const s of sessions) {
          console.log(
            `${chalk.cyan(s.id.slice(0, 8))}  ${statusColor(s.status)}  ${s.type}  target:${s.targetId.slice(0, 8)}  proposals:${s.proposals.length}`
          );
        }
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("resume <session-id>")
    .description("Resume a paused session")
    .action(async (sessionId: string) => {
      try {
        const sevenDir = await resolveSevenDir();
        const session = await loadSession(sevenDir, sessionId);
        if (session.status === "paused") {
          session.status = "active";
          await saveSession(sevenDir, session);
          console.log(chalk.green(`Session ${sessionId.slice(0, 8)} resumed.`));
        } else {
          console.log(chalk.dim(`Session already ${session.status}.`));
        }
        // Print state for agent continuation
        console.log(chalk.bold(`\nSession State:`));
        console.log(`  Type:    ${session.type}`);
        console.log(`  Target:  ${session.targetId}`);
        console.log(`  Status:  ${statusColor(session.status)}`);
        console.log(`  Proposals: ${session.proposals.length}`);
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("close <session-id>")
    .description("Close a completed session")
    .action(async (sessionId: string) => {
      try {
        const sevenDir = await resolveSevenDir();
        const session = await loadSession(sevenDir, sessionId);
        if (session.status === "completed") {
          console.log(chalk.dim(`Session ${sessionId.slice(0, 8)} already closed.`));
          return;
        }
        session.status = "completed";
        await saveSession(sevenDir, session);
        console.log(chalk.green(`Session ${session.id.slice(0, 8)} closed.`));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  return cmd;
}

function statusColor(status: string): string {
  switch (status) {
    case "active":
      return chalk.green(status);
    case "paused":
      return chalk.yellow(status);
    case "completed":
      return chalk.dim(status);
    default:
      return status;
  }
}
