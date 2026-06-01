import { readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { readdir, stat } from "node:fs/promises";

const INDEX_FILE = "index.json";
const SHORT_ID_FILE = "short-ids.json";

export async function readIndex(
  sevenDir: string
): Promise<Record<string, string>> {
  try {
    const raw = await readFile(join(sevenDir, INDEX_FILE), "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function readShortIdIndex(
  sevenDir: string
): Promise<Record<string, string>> {
  try {
    const raw = await readFile(join(sevenDir, SHORT_ID_FILE), "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeShortIdIndex(
  sevenDir: string,
  index: Record<string, string>
): Promise<void> {
  const p = join(sevenDir, SHORT_ID_FILE);
  const tmp = p + ".tmp";
  await writeFile(tmp, JSON.stringify(index, null, 2) + "\n", "utf-8");
  await rename(tmp, p);
}

export async function writeIndex(
  sevenDir: string,
  index: Record<string, string>
): Promise<void> {
  const indexPath = join(sevenDir, INDEX_FILE);
  const tmpPath = indexPath + ".tmp";
  await writeFile(tmpPath, JSON.stringify(index, null, 2) + "\n", "utf-8");
  await rename(tmpPath, indexPath);
}

export async function addToIndex(
  sevenDir: string,
  id: string,
  relativePath: string,
  shortId?: string
): Promise<void> {
  const index = await readIndex(sevenDir);
  // Store POSIX paths
  index[id] = relativePath.replace(/\\/g, "/");
  await writeIndex(sevenDir, index);

  if (shortId) {
    const shortIndex = await readShortIdIndex(sevenDir);
    shortIndex[shortId] = id;
    await writeShortIdIndex(sevenDir, shortIndex);
  }
}

export async function removeFromIndex(
  sevenDir: string,
  id: string
): Promise<void> {
  const index = await readIndex(sevenDir);
  delete index[id];
  await writeIndex(sevenDir, index);
}

async function walkJson(
  dir: string,
  base: string
): Promise<Array<{ relativePath: string; fullPath: string }>> {
  const results: Array<{ relativePath: string; fullPath: string }> = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await walkJson(fullPath, base);
      results.push(...sub);
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".json") &&
      entry.name !== INDEX_FILE
    ) {
      const { relative } = await import("node:path");
      const rel = relative(base, fullPath).replace(/\\/g, "/");
      results.push({ relativePath: rel, fullPath });
    }
  }
  return results;
}

export async function repairIndex(
  sevenDir: string,
  options?: { dryRun?: boolean }
): Promise<{ added: string[]; removed: string[]; unchanged: number }> {
  const currentIndex = await readIndex(sevenDir);
  const files = await walkJson(sevenDir, sevenDir);

  const freshIndex: Record<string, string> = {};
  const added: string[] = [];

  for (const { relativePath, fullPath } of files) {
    try {
      const raw = await readFile(fullPath, "utf-8");
      const data = JSON.parse(raw);
      if (data && typeof data.id === "string") {
        freshIndex[data.id] = relativePath;
        if (!currentIndex[data.id]) {
          added.push(data.id);
        }
      }
    } catch {
      // Skip unparseable files
    }
  }

  const removed: string[] = [];
  for (const id of Object.keys(currentIndex)) {
    if (!freshIndex[id]) {
      removed.push(id);
    }
  }

  const unchanged =
    Object.keys(freshIndex).length - added.length;

  if (!options?.dryRun) {
    await writeIndex(sevenDir, freshIndex);

    // Also rebuild short-id index
    const freshShortIndex: Record<string, string> = {};
    for (const { fullPath } of files) {
      try {
        const raw = await readFile(fullPath, "utf-8");
        const data = JSON.parse(raw);
        if (data && data.id && data.shortId) {
          freshShortIndex[data.shortId] = data.id;
        }
      } catch {
        // Skip
      }
    }
    await writeShortIdIndex(sevenDir, freshShortIndex);
  }

  return { added, removed, unchanged };
}
