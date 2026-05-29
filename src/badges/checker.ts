import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectState, BadgeDefinition, EarnedBadge } from "./types.js";

const EARNED_FILE = "badges/earned.json";

export function checkBadges(
  state: ProjectState,
  badges: BadgeDefinition[],
  earned: EarnedBadge[]
): EarnedBadge[] {
  const earnedIds = new Set(earned.map((e) => e.badgeId));
  const newlyEarned: EarnedBadge[] = [];

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;
    if (badge.check(state)) {
      newlyEarned.push({
        badgeId: badge.id,
        earnedAt: new Date().toISOString(),
      });
    }
  }

  return newlyEarned;
}

export async function loadEarnedBadges(
  sevenDir: string
): Promise<EarnedBadge[]> {
  try {
    const raw = await readFile(join(sevenDir, EARNED_FILE), "utf-8");
    return JSON.parse(raw) as EarnedBadge[];
  } catch {
    return [];
  }
}

export async function saveEarnedBadges(
  sevenDir: string,
  badges: EarnedBadge[]
): Promise<void> {
  const dir = join(sevenDir, "badges");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(sevenDir, EARNED_FILE),
    JSON.stringify(badges, null, 2) + "\n",
    "utf-8"
  );
}
