import { Hono } from "hono";
import { loadEarnedBadges } from "../../../badges/checker.js";
import { builtinBadges } from "../../../badges/builtins/index.js";
import { loadCustomBadges } from "../../../badges/loader.js";

export function badgesRoute(sevenDir: string) {
  const route = new Hono();

  route.get("/", async (c) => {
    const earned = await loadEarnedBadges(sevenDir);
    const custom = await loadCustomBadges(sevenDir);
    const allBadges = [...builtinBadges, ...custom];

    const earnedIds = new Set(earned.map((e) => e.badgeId));

    const available = allBadges.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      category: b.category,
      earned: earnedIds.has(b.id),
      earnedAt: earned.find((e) => e.badgeId === b.id)?.earnedAt ?? null,
    }));

    return c.json({ earned, available });
  });

  return route;
}
