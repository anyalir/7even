import { Command } from "commander";
import crypto from "node:crypto";
import { resolveSevenDir, createItem, readItem, listItems, updateItem, moveItem, addComment } from "../../core/storage.js";
import { readShortIdIndex } from "../../core/index-manager.js";
import { generateSlug } from "../../core/slug.js";
import { getGitAuthor } from "../../core/git.js";
import { formatItem, formatItemList } from "../formatters/item.js";
import chalk from "chalk";

export function makeTaskCommand(): Command {
  const cmd = new Command("task")
    .alias("t")
    .description("Manage tasks");

  cmd
    .command("create")
    .description("Create a new task")
    .requiredOption("-d, --description <text>", "Task description")
    .requiredOption("--parent <id>", "Parent key result ID or slug")
    .action(async (opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const parentId = await resolveId(sevenDir, opts.parent, "key-result");
        // Verify parent exists
        await readItem(sevenDir, parentId);
        const slug = generateSlug(opts.description);
        const author = getGitAuthor();
        const data = {
          id: crypto.randomUUID(),
          status: "to-do",
          createdAt: new Date().toISOString(),
          createdBy: `${author.name} <${author.email}>`,
          description: opts.description,
          parentId,
        };
        const id = await createItem(sevenDir, "task", slug, data, parentId);
        const { data: created } = await readItem(sevenDir, id);
        console.log(chalk.green(`Created task: ${slug}`));
        console.log(chalk.dim(`ID: ${id}`) + (created.shortId ? `  ${chalk.cyan(created.shortId)}` : ""));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("show <id>")
    .description("Show task details")
    .action(async (id) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "task");
        const { data, path } = await readItem(sevenDir, resolvedId);
        const slug = path.replace(/\.json$/, "").split("/").pop() ?? id;
        // Resolve dependsOn UUIDs to short IDs for readability
        if (data.dependsOn?.length > 0) {
          const shortIndex = await readShortIdIndex(sevenDir);
          const uuidToShortId = Object.fromEntries(
            Object.entries(shortIndex).map(([shortId, uuid]) => [uuid, shortId])
          );
          data.dependsOn = data.dependsOn.map((uuid: string) => uuidToShortId[uuid] ?? uuid);
        }
        console.log(formatItem(data, "task", slug));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("list")
    .description("List tasks")
    .option("-s, --status <status>", "Filter by status")
    .action(async (opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const items = await listItems(sevenDir, "task", opts.status);
        console.log(formatItemList(items));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("update <id>")
    .description("Update task fields")
    .option("-d, --description <text>", "Update description")
    .action(async (id, opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "task");
        const updates: Record<string, unknown> = {};
        if (opts.description) updates.description = opts.description;
        await updateItem(sevenDir, resolvedId, updates);
        console.log(chalk.green("Task updated."));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("move <id> <status>")
    .description("Transition task status (to-do|in-progress|done)")
    .action(async (id, status) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "task");
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
    .description("Add a comment to a task")
    .requiredOption("-m, --message <text>", "Comment text")
    .option("--type <type>", "Comment type: human or agent", "human")
    .action(async (id, opts) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "task");
        await addComment(sevenDir, resolvedId, opts.message, opts.type);
        console.log(chalk.green("Comment added."));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("assign <id>")
    .description("Assign a task to a user")
    .option("--email <email>", "Assignee email")
    .option("--github <username>", "Assignee GitHub username")
    .action(async (id, opts) => {
      try {
        if (!opts.email && !opts.github) {
          throw new Error("At least --email or --github is required");
        }
        const sevenDir = await resolveSevenDir();
        const resolvedId = await resolveId(sevenDir, id, "task");
        const assignee = {
          email: opts.email ?? "",
          github: opts.github ?? "",
        };
        await updateItem(sevenDir, resolvedId, { assignee });
        console.log(chalk.green(`Task assigned to ${opts.email ?? opts.github}`));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("depend <task-id> <depends-on-id>")
    .description("Add a dependency (task-id depends on depends-on-id)")
    .action(async (taskId: string, dependsOnId: string) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedTaskId = await resolveId(sevenDir, taskId, "task");
        const resolvedDepId = await resolveId(sevenDir, dependsOnId, "task");
        const { data } = await readItem(sevenDir, resolvedTaskId);
        const deps: string[] = data.dependsOn ?? [];
        if (deps.includes(resolvedDepId)) {
          console.log(chalk.dim("Dependency already exists."));
          return;
        }
        deps.push(resolvedDepId);
        await updateItem(sevenDir, resolvedTaskId, { dependsOn: deps });
        console.log(chalk.green(`${data.shortId || taskId} now depends on ${dependsOnId}`));
      } catch (err: any) {
        console.error(chalk.red(err.message));
        process.exitCode = 1;
      }
    });

  cmd
    .command("undepend <task-id> <depends-on-id>")
    .description("Remove a dependency")
    .action(async (taskId: string, dependsOnId: string) => {
      try {
        const sevenDir = await resolveSevenDir();
        const resolvedTaskId = await resolveId(sevenDir, taskId, "task");
        const resolvedDepId = await resolveId(sevenDir, dependsOnId, "task");
        const { data } = await readItem(sevenDir, resolvedTaskId);
        const deps: string[] = (data.dependsOn ?? []).filter((d: string) => d !== resolvedDepId);
        await updateItem(sevenDir, resolvedTaskId, { dependsOn: deps });
        console.log(chalk.green(`Dependency removed.`));
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
  // Detect common typo: leading zero instead of letter O
  if (/^0\d/i.test(idOrSlug)) {
    const suggestion = idOrSlug.replace(/^0/, "O").toUpperCase();
    throw new Error(`Invalid identifier: "${idOrSlug}". Did you mean "${suggestion}"? (letter O, not zero)`);
  }
  throw new Error(`Item not found: ${idOrSlug}`);
}
