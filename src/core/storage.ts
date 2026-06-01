import { readFile, writeFile, mkdir, rename, readdir } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import crypto from "node:crypto";
import { ObjectiveSchema } from "./schemas/objective.js";
import { KeyResultSchema } from "./schemas/key-result.js";
import { TaskSchema } from "./schemas/task.js";
import {
  readIndex,
  addToIndex,
  removeFromIndex,
  writeIndex,
  readShortIdIndex,
} from "./index-manager.js";
import { getGitRoot, getGitAuthor } from "./git.js";
import { generateSlug } from "./slug.js";
import { generateShortId } from "./counters.js";
import type { ItemType } from "../types/index.js";

const SCHEMAS = {
  objective: ObjectiveSchema,
  "key-result": KeyResultSchema,
  task: TaskSchema,
} as const;

const STATUS_SETS: Record<ItemType, readonly string[]> = {
  objective: ["proposed", "accepted", "achieved"],
  "key-result": ["aspirational", "achieved"],
  task: ["to-do", "in-progress", "done"],
};

const ITEM_FILE_NAMES: Record<ItemType, string | null> = {
  objective: "objective.json",
  "key-result": "kr.json",
  task: null, // tasks use slug-based names
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_ID_RE = /^O\d+(KR\d+(T\d+)?)?$/i;

/**
 * Resolve a shortId (e.g. "O1KR2T3") or UUID to a UUID.
 */
export async function resolveId(
  sevenDir: string,
  idOrShortId: string
): Promise<string> {
  if (UUID_RE.test(idOrShortId)) return idOrShortId;
  const upper = idOrShortId.toUpperCase();
  if (SHORT_ID_RE.test(upper)) {
    const shortIndex = await readShortIdIndex(sevenDir);
    const uuid = shortIndex[upper];
    if (!uuid) throw new Error(`Short ID not found: ${idOrShortId}`);
    return uuid;
  }
  // Common typo: leading zero instead of letter O
  if (/^0\d/.test(idOrShortId)) {
    throw new Error(`Invalid identifier: ${idOrShortId}. Did you mean "${idOrShortId.replace(/^0/, "O").toUpperCase()}"? (letter O, not zero)`);
  }
  throw new Error(`Invalid identifier: ${idOrShortId}. Use UUID or short ID (e.g. O1KR2T3).`);
}

export async function resolveSevenDir(): Promise<string> {
  const root = getGitRoot();
  return join(root, ".7even");
}

export async function initSevenDir(sevenDir: string): Promise<void> {
  try {
    await mkdir(sevenDir, { recursive: false });
  } catch (err: any) {
    if (err.code === "EEXIST") {
      throw new Error(".7even directory already exists");
    }
    throw err;
  }
  await writeFile(
    join(sevenDir, "index.json"),
    "{}\n",
    "utf-8"
  );
}

function getSchemaForType(itemType: ItemType) {
  return SCHEMAS[itemType];
}

function inferItemType(path: string): ItemType | null {
  if (path.includes("objective.json")) return "objective";
  if (path.includes("kr.json")) return "key-result";
  // Tasks are any other JSON file
  if (path.endsWith(".json")) return "task";
  return null;
}

async function resolveParentPath(
  sevenDir: string,
  parentId: string
): Promise<string> {
  const index = await readIndex(sevenDir);
  const parentRelPath = index[parentId];
  if (!parentRelPath) {
    throw new Error(`Parent item not found in index: ${parentId}`);
  }
  // Return the directory containing the parent file
  return dirname(join(sevenDir, parentRelPath));
}

async function findAvailableSlug(
  dir: string,
  baseSlug: string,
  extension: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 2;
  while (true) {
    try {
      await readFile(join(dir, slug + extension), "utf-8");
      // File exists, try next
      slug = `${baseSlug}-${counter}`;
      counter++;
    } catch {
      return slug;
    }
  }
}

export async function createItem(
  sevenDir: string,
  itemType: ItemType,
  slug: string,
  data: unknown,
  parentId?: string
): Promise<string> {
  const schema = getSchemaForType(itemType);
  const validated = schema.parse(data) as any;
  const id = validated.id as string;
  const status = validated.status as string;

  // Generate hierarchical shortId
  let parentShortId: string | undefined;
  if (parentId) {
    const parent = await readItem(sevenDir, parentId);
    parentShortId = parent.data.shortId || undefined;
  }
  const shortId = await generateShortId(sevenDir, itemType, parentShortId);
  validated.shortId = shortId;

  let targetDir: string;

  if (parentId) {
    const parentDir = await resolveParentPath(sevenDir, parentId);
    if (itemType === "key-result") {
      targetDir = join(parentDir, status, slug);
    } else if (itemType === "task") {
      targetDir = join(parentDir, status);
    } else {
      targetDir = join(parentDir, status, slug);
    }
  } else {
    // Top-level objective
    targetDir = join(sevenDir, status, slug);
  }

  await mkdir(targetDir, { recursive: true });

  let fileName: string;
  if (itemType === "task") {
    const availableSlug = await findAvailableSlug(targetDir, slug, ".json");
    fileName = availableSlug + ".json";
  } else {
    fileName = ITEM_FILE_NAMES[itemType]!;
  }

  const filePath = join(targetDir, fileName);
  await writeFile(filePath, JSON.stringify(validated, null, 2) + "\n", "utf-8");

  const relativePath = relative(sevenDir, filePath).replace(/\\/g, "/");
  await addToIndex(sevenDir, id, relativePath, shortId);

  return id;
}

export async function readItem(
  sevenDir: string,
  id: string
): Promise<{ data: any; path: string }> {
  const index = await readIndex(sevenDir);
  const relPath = index[id];
  if (!relPath) {
    throw new Error(`Item not found in index: ${id}`);
  }
  const fullPath = join(sevenDir, relPath);
  const raw = await readFile(fullPath, "utf-8");
  const data = JSON.parse(raw);

  // Validate against appropriate schema
  const itemType = inferItemType(relPath);
  if (itemType) {
    getSchemaForType(itemType).parse(data);
  }

  return { data, path: relPath };
}

export async function updateItem(
  sevenDir: string,
  id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { data, path: relPath } = await readItem(sevenDir, id);
  const merged = { ...data, ...updates };

  const itemType = inferItemType(relPath);
  if (itemType) {
    getSchemaForType(itemType).parse(merged);
  }

  const fullPath = join(sevenDir, relPath);
  await writeFile(fullPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

async function getAllDescendantIds(
  sevenDir: string,
  parentPath: string
): Promise<string[]> {
  const index = await readIndex(sevenDir);
  const parentDir = dirname(parentPath);
  const ids: string[] = [];

  for (const [id, path] of Object.entries(index)) {
    if (path !== parentPath && path.startsWith(parentDir + "/")) {
      ids.push(id);
    }
  }
  return ids;
}

export async function moveItem(
  sevenDir: string,
  id: string,
  newStatus: string
): Promise<void> {
  const index = await readIndex(sevenDir);
  const relPath = index[id];
  if (!relPath) {
    throw new Error(`Item not found in index: ${id}`);
  }

  const itemType = inferItemType(relPath);
  if (!itemType) {
    throw new Error(`Cannot determine item type from path: ${relPath}`);
  }

  const validStatuses = STATUS_SETS[itemType];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(
      `Invalid status '${newStatus}' for ${itemType}. Valid: ${validStatuses.join(", ")}`
    );
  }

  const fullPath = join(sevenDir, relPath);
  const data = JSON.parse(await readFile(fullPath, "utf-8"));

  if (itemType === "objective") {
    // Move entire objective directory subtree
    const objDir = dirname(fullPath); // e.g., .7even/proposed/my-objective
    const statusDir = dirname(objDir); // e.g., .7even/proposed
    const parentOfStatus = dirname(statusDir); // e.g., .7even
    const objSlug = objDir.split("/").pop()!;
    const newObjDir = join(parentOfStatus, newStatus, objSlug);

    await mkdir(dirname(newObjDir), { recursive: true });

    // Rename directory
    const { rename: fsRename } = await import("node:fs/promises");
    await fsRename(objDir, newObjDir);

    // Update all affected paths in index
    const oldPrefix = relative(sevenDir, objDir).replace(/\\/g, "/");
    const newPrefix = relative(sevenDir, newObjDir).replace(/\\/g, "/");

    const updatedIndex = await readIndex(sevenDir);
    for (const [itemId, itemPath] of Object.entries(updatedIndex)) {
      if (itemPath.startsWith(oldPrefix)) {
        updatedIndex[itemId] = itemPath.replace(oldPrefix, newPrefix);
      }
    }

    // Update the objective's status in the JSON file
    data.status = newStatus;
    await writeFile(
      join(newObjDir, "objective.json"),
      JSON.stringify(data, null, 2) + "\n",
      "utf-8"
    );

    await writeIndex(sevenDir, updatedIndex);
  } else {
    // For KR and Task: move individual file
    const currentDir = dirname(fullPath);
    const parentDir = dirname(currentDir); // go up past status dir
    const newDir = join(parentDir, newStatus);

    if (itemType === "key-result") {
      // KR has its own slug directory
      const krSlug = currentDir.split("/").pop()!;
      const oldKrDir = currentDir;
      const statusParent = dirname(dirname(currentDir)); // up past slug and status
      const newKrDir = join(statusParent, newStatus, krSlug);

      await mkdir(newKrDir, { recursive: true });

      // Move entire KR directory (contains kr.json and task subdirs)
      const { rename: fsRename } = await import("node:fs/promises");
      await fsRename(oldKrDir, newKrDir);

      const oldPrefix = relative(sevenDir, oldKrDir).replace(/\\/g, "/");
      const newPrefix = relative(sevenDir, newKrDir).replace(/\\/g, "/");

      const updatedIndex = await readIndex(sevenDir);
      for (const [itemId, itemPath] of Object.entries(updatedIndex)) {
        if (itemPath.startsWith(oldPrefix)) {
          updatedIndex[itemId] = itemPath.replace(oldPrefix, newPrefix);
        }
      }

      data.status = newStatus;
      await writeFile(
        join(newKrDir, "kr.json"),
        JSON.stringify(data, null, 2) + "\n",
        "utf-8"
      );

      await writeIndex(sevenDir, updatedIndex);
    } else {
      // Task: just move the file
      await mkdir(newDir, { recursive: true });
      const fileName = fullPath.split("/").pop()!;
      const newPath = join(newDir, fileName);
      await rename(fullPath, newPath);

      data.status = newStatus;
      await writeFile(
        newPath,
        JSON.stringify(data, null, 2) + "\n",
        "utf-8"
      );

      const newRelPath = relative(sevenDir, newPath).replace(/\\/g, "/");
      const updatedIndex = await readIndex(sevenDir);
      updatedIndex[id] = newRelPath;
      await writeIndex(sevenDir, updatedIndex);
    }
  }
}

export async function addComment(
  sevenDir: string,
  id: string,
  text: string,
  type: "human" | "agent"
): Promise<void> {
  const { data, path: relPath } = await readItem(sevenDir, id);
  const author = getGitAuthor();

  const comment = {
    author: `${author.name} <${author.email}>`,
    date: new Date().toISOString(),
    text,
    type,
  };

  data.comments = data.comments || [];
  data.comments.push(comment);

  const fullPath = join(sevenDir, relPath);
  await writeFile(fullPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function listItems(
  sevenDir: string,
  itemType?: ItemType,
  status?: string
): Promise<Array<{ id: string; path: string; data: any }>> {
  const index = await readIndex(sevenDir);
  const results: Array<{ id: string; path: string; data: any }> = [];

  for (const [id, relPath] of Object.entries(index)) {
    const type = inferItemType(relPath);
    if (itemType && type !== itemType) continue;
    if (status && !relPath.includes(`/${status}/`)) continue;

    try {
      const fullPath = join(sevenDir, relPath);
      const raw = await readFile(fullPath, "utf-8");
      results.push({ id, path: relPath, data: JSON.parse(raw) });
    } catch {
      // Skip unreadable items
    }
  }

  return results;
}
