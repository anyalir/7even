import chalk from "chalk";
import type { ItemType } from "../../types/index.js";

const STATUS_COLORS: Record<string, (s: string) => string> = {
  // Objectives
  proposed: chalk.gray,
  accepted: chalk.yellow,
  achieved: chalk.green,
  // Key Results
  aspirational: chalk.yellow,
  // Tasks
  "to-do": chalk.gray,
  "in-progress": chalk.yellow,
  done: chalk.green,
};

const TYPE_LABELS: Record<ItemType, string> = {
  objective: "OBJ",
  "key-result": "KR",
  task: "TASK",
};

export function formatItem(
  data: any,
  itemType: ItemType,
  slug: string
): string {
  const colorFn = STATUS_COLORS[data.status] ?? chalk.white;
  const lines: string[] = [];

  lines.push(
    `${colorFn("●")} ${chalk.bold(data.description)} ${chalk.dim(`[${data.status}]`)}`
  );
  lines.push(chalk.dim(`  ID: ${data.id}`));
  lines.push(`  Type: ${TYPE_LABELS[itemType]}  Slug: ${slug}`);

  if (data.assignee) {
    lines.push(
      `  Assignee: ${data.assignee.email}${data.assignee.github ? ` (@${data.assignee.github})` : ""}`
    );
  }

  if (data.statusQuo) lines.push(`  Status Quo: ${data.statusQuo}`);
  if (data.desiredOutcome) lines.push(`  Desired Outcome: ${data.desiredOutcome}`);
  if (data.resultMeasure) lines.push(`  Result Measure: ${data.resultMeasure}`);

  if (data.estimationHistory?.length > 0) {
    lines.push(`  Estimates:`);
    for (const est of data.estimationHistory) {
      lines.push(`    ${est.date} — ${est.spRemaining} SP by ${est.estimator}`);
    }
  }

  if (data.comments?.length > 0) {
    lines.push(`  Comments:`);
    for (const c of data.comments) {
      const badge = c.type === "agent" ? chalk.cyan("[agent]") : chalk.blue("[human]");
      lines.push(`    ${badge} ${chalk.dim(c.date)} ${c.author}`);
      lines.push(`      ${c.text}`);
    }
  }

  return lines.join("\n");
}

export function formatItemList(
  items: Array<{ id: string; path: string; data: any }>
): string {
  if (items.length === 0) return chalk.dim("No items found.");

  const lines: string[] = [];
  for (const item of items) {
    const type = inferTypeFromPath(item.path);
    const colorFn = STATUS_COLORS[item.data.status] ?? chalk.white;
    const slug = extractSlug(item.path, type);
    lines.push(
      `${colorFn("●")} ${chalk.dim(TYPE_LABELS[type].padEnd(4))} ${item.data.status.padEnd(14)} ${slug.padEnd(30)} ${item.data.description}`
    );
  }
  return lines.join("\n");
}

function inferTypeFromPath(path: string): ItemType {
  if (path.includes("objective.json")) return "objective";
  if (path.includes("kr.json")) return "key-result";
  return "task";
}

function extractSlug(path: string, type: ItemType): string {
  const parts = path.replace(/\.json$/, "").split("/");
  if (type === "task") return parts[parts.length - 1];
  if (type === "key-result") return parts[parts.length - 2] ?? parts[parts.length - 1];
  if (type === "objective") return parts[parts.length - 2] ?? parts[parts.length - 1];
  return parts[parts.length - 1];
}
