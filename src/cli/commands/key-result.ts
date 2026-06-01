import { Command } from "commander";
import crypto from "node:crypto";
import { resolveSevenDir, createItem, readItem, listItems, updateItem, moveItem, addComment } from "../../core/storage.js";
import { generateSlug } from "../../core/slug.js";
import { getGitAuthor } from "../../core/git.js";
import { formatItem, formatItemList } from "../formatters/item.js";
import chalk from "chalk";

export function makeKeyResultCommand(): Command {
  const cmd = new Command("key-result")
    .alias("kr")
    .description("Manage key results");

  cmd
    .command("create")
    .description("Create a new key result")
    .requiredOption("-d, --description <text>", "Key result description")
    .option("-s, --summary <text>", "Short summary (5-10 words)")
    .requiredOption("--parent <id>", "Parent objective ID or slug")
    .action(async (opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const parentId = await resolveId(sevenDir, opts.parent, "objective");
        // Verify parent exists and is an objective
        const { data: parentData } = await readItem(sevenDir, parentId);
        const slug = generateSlug(opts.summary || opts.description);
        const author = getGitAuthor();
        const data: Record<string, unknown> = {
          id: crypto.randomUUID(),
          status: "aspirational",
          createdAt: new Date().toISOString(),
          createdBy: `${author.name} <${author.email}>`,
          description: opts.description,
          parentId,
        };
        if (opts.summary) data.summary = opts.summary;
        const id = await createItem(sevenDir, "key-result", slug, data, parentId);
        const { data: created } = await readItem(sevenDir, id);
        console.log(chalk.green(`Created key result: ${slug}`));
        console.log(chalk.dim(`ID: ${id}`) + (created.shortId ? `  ${chalk.cyan(created.shortId)}` : ""));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("show <id>")
    .description("Show key result details")
    .action(async (id) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "key-result");
        const { data, path } = await readItem(sevenDir, resolvedId);
        const slug = extractSlugFromPath(path);
        console.log(formatItem(data, "key-result", slug));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("list")
    .description("List key results")
    .option("-s, --status <status>", "Filter by status")
    .action(async (opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const items = await listItems(sevenDir, "key-result", opts.status);
        console.log(formatItemList(items));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("update <id>")
    .description("Update key result fields")
    .option("-d, --description <text>", "Update description")
    .option("--result-measure <text>", "Update result measure")
    .action(async (id, opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "key-result");
        const updates: Record<string, unknown> = {};
        if (opts.description) updates.description = opts.description;
        if (opts.resultMeasure) updates.resultMeasure = opts.resultMeasure;
        await updateItem(sevenDir, resolvedId, updates);
        console.log(chalk.green("Key result updated."));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("move <id> <status>")
    .description("Transition key result status (aspirational|achieved)")
    .action(async (id, status) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "key-result");
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
    .description("Add a comment to a key result")
    .requiredOption("-m, --message <text>", "Comment text")
    .option("--type <type>", "Comment type: human or agent", "human")
    .action(async (id, opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "key-result");
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
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)) {
    return idOrSlug;
  }
  if (/^O\d+(KR\d+(T\d+)?)?$/i.test(idOrSlug)) {
    const { resolveId: resolveShortId } = await import("../../core/storage.js");
    return resolveShortId(sevenDir, idOrSlug);
  }
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
