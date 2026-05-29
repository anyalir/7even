import type { VelocityWindow } from "./velocity.js";

export function projectEta(
  remainingSp: number,
  velocityWindows: VelocityWindow[]
): { eta: string; confidence: "high" | "medium" | "low" } {
  const windowCount = velocityWindows.length;
  const confidence: "high" | "medium" | "low" =
    windowCount >= 5 ? "high" : windowCount >= 2 ? "medium" : "low";

  if (windowCount === 0 || remainingSp <= 0) {
    const eta = new Date().toISOString().slice(0, 10);
    return { eta, confidence };
  }

  // Use last 3 windows (or fewer)
  const recent = velocityWindows.slice(-3);

  // Calculate average SP per day across windows
  let totalSp = 0;
  let totalDays = 0;
  for (const w of recent) {
    const start = new Date(w.start);
    const end = new Date(w.end);
    const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1);
    totalSp += w.completedSp;
    totalDays += days;
  }

  const avgSpPerDay = totalSp / totalDays;
  if (avgSpPerDay <= 0) {
    return { eta: "unknown", confidence };
  }

  const daysRemaining = Math.ceil(remainingSp / avgSpPerDay);
  const etaDate = new Date();
  etaDate.setDate(etaDate.getDate() + daysRemaining);

  return {
    eta: etaDate.toISOString().slice(0, 10),
    confidence,
  };
}
