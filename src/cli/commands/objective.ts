import { Command } from "commander";
import crypto from "node:crypto";
import { resolveSevenDir, createItem, readItem, listItems, updateItem, moveItem, addComment } from "../../core/storage.js";
import { generateSlug } from "../../core/slug.js";
import { getGitAuthor } from "../../core/git.js";
import { formatItem, formatItemList } from "../formatters/item.js";
import chalk from "chalk";

export function makeObjectiveCommand(): Command {
  const cmd = new Command("objective")
    .alias("o")
    .description("Manage objectives");

  cmd
    .command("create")
    .description("Create a new objective")
    .requiredOption("-d, --description <text>", "Objective description")
    .option("-s, --summary <text>", "Short summary (5-10 words)")
    .action(async (opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const slug = generateSlug(opts.summary || opts.description);
        const author = getGitAuthor();
        const data: Record<string, unknown> = {
          id: crypto.randomUUID(),
          status: "proposed",
          createdAt: new Date().toISOString(),
          createdBy: `${author.name} <${author.email}>`,
          description: opts.description,
        };
        if (opts.summary) data.summary = opts.summary;
        const id = await createItem(sevenDir, "objective", slug, data);
        const { data: created } = await readItem(sevenDir, id);
        console.log(chalk.green(`Created objective: ${slug}`));
        console.log(chalk.dim(`ID: ${id}`) + (created.shortId ? `  ${chalk.cyan(created.shortId)}` : ""));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("show <id>")
    .description("Show objective details")
    .action(async (id) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "objective");
        const { data, path } = await readItem(sevenDir, resolvedId);
        const slug = extractSlugFromPath(path);
        console.log(formatItem(data, "objective", slug));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("list")
    .description("List objectives")
    .option("-s, --status <status>", "Filter by status")
    .action(async (opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const items = await listItems(sevenDir, "objective", opts.status);
        console.log(formatItemList(items));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("update <id>")
    .description("Update objective fields")
    .option("-d, --description <text>", "Update description")
    .option("--status-quo <text>", "Update status quo")
    .option("--desired-outcome <text>", "Update desired outcome")
    .option("--constraints <text>", "Update constraints")
    .option("--functional-requirements <text>", "Update functional requirements")
    .option("--nonfunctional-requirements <text>", "Update nonfunctional requirements")
    .action(async (id, opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "objective");
        const updates: Record<string, unknown> = {};
        if (opts.description) updates.description = opts.description;
        if (opts.statusQuo) updates.statusQuo = opts.statusQuo;
        if (opts.desiredOutcome) updates.desiredOutcome = opts.desiredOutcome;
        if (opts.constraints) updates.constraints = opts.constraints;
        if (opts.functionalRequirements) updates.functionalRequirements = opts.functionalRequirements;
        if (opts.nonfunctionalRequirements) updates.nonfunctionalRequirements = opts.nonfunctionalRequirements;
        await updateItem(sevenDir, resolvedId, updates);
        console.log(chalk.green("Objective updated."));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("move <id> <status>")
    .description("Transition objective status (proposed|accepted|achieved)")
    .action(async (id, status) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "objective");
        const { data } = await readItem(sevenDir, resolvedId);
        const oldStatus = data.status;
        await moveItem(sevenDir, resolvedId, status);
        console.log(chalk.green(`${oldStatus} → ${status}`));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("comment <id>")
    .description("Add a comment to an objective")
    .requiredOption("-m, --message <text>", "Comment text")
    .option("--type <type>", "Comment type: human or agent", "human")
    .action(async (id, opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "objective");
        await addComment(sevenDir, resolvedId, opts.message, opts.type);
        console.log(chalk.green("Comment added."));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  return cmd;
}

async function resolveId(
  sevenDir: string,
  idOrSlug: string,
  itemType: "objective" | "key-result" | "task"
): Promise<string> {
  // If it looks like a UUID, return directly
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)) {
    return idOrSlug;
  }
  // Try shortId (e.g. O1, O1KR2, O1KR2T3)
  if (/^O\d+(KR\d+(T\d+)?)?$/i.test(idOrSlug)) {
    const { resolveId: resolveShortId } = await import("../../core/storage.js");
    return resolveShortId(sevenDir, idOrSlug);
  }
  // Otherwise search by slug match
  const items = await listItems(sevenDir, itemType);
  for (const item of items) {
    if (item.path.includes(`/${idOrSlug}/`) || item.path.includes(`/${idOrSlug}.json`)) {
      return item.id;
    }
  }
  throw new Error(`Item not found: ${idOrSlug}`);
}

function extractSlugFromPath(path: string): string {
  const parts = path.replace(/\.json$/, "").split("/");
  return parts[parts.length - 2] ?? parts[parts.length - 1];
}
