import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { BadgeDefinition } from "./types.js";

const CUSTOM_DIR = "badges/custom";

export async function loadCustomBadges(
  sevenDir: string
): Promise<BadgeDefinition[]> {
  const customDir = join(sevenDir, CUSTOM_DIR);
  let entries: string[];
  try {
    const dirEntries = await readdir(customDir);
    entries = dirEntries.filter(
      (f) => f.endsWith(".js") || f.endsWith(".mjs")
    );
  } catch {
    return [];
  }

  const badges: BadgeDefinition[] = [];
  for (const file of entries) {
    try {
      const fullPath = join(customDir, file);
      const mod = await import(pathToFileURL(fullPath).href);
      const badge = mod.default ?? mod;
      if (isValidBadge(badge)) {
        badges.push(badge);
      } else {
        console.warn(`Invalid badge module: ${file}`);
      }
    } catch (err) {
      console.warn(`Failed to load custom badge ${file}:`, err);
    }
  }
  return badges;
}

function isValidBadge(obj: unknown): obj is BadgeDefinition {
  if (!obj || typeof obj !== "object") return false;
  const b = obj as Record<string, unknown>;
  return (
    typeof b.id === "string" &&
    typeof b.name === "string" &&
    typeof b.description === "string" &&
    typeof b.icon === "string" &&
    typeof b.category === "string" &&
    typeof b.check === "function"
  );
}
