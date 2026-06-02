import { forecast, type ForecastConfig, type ForecastResult } from "./forecast.js";

export type EstEntry = { date: string; spRemaining: number; estimator: string };

export type GanttInput = {
  id: string;
  type: "objective" | "key-result" | "task";
  name: string;
  shortId?: string;
  summary?: string;
  createdAt: string;
  status: string;
  estimationHistory?: EstEntry[];
  parentId?: string;
  dependsOn?: string[];
  assignee?: string | null;
};

export type GanttBar = {
  id: string;
  type: string;
  name: string;
  shortId?: string;
  summary?: string;
  start: string;
  end: string;
  parentId?: string;
  progress: number;
  dependsOn?: string[];
  /** True if start/end include forecasted data */
  isForecast?: boolean;
};

function minStr(a: string, b: string): string {
  return a < b ? a : b;
}
function maxStr(a: string, b: string): string {
  return a > b ? a : b;
}

export function computeGanttBars(
  items: GanttInput[],
  forecastConfig?: ForecastConfig
): GanttBar[] {
  // Run forecast for non-done tasks if config provided
  const forecastMap = new Map<string, ForecastResult>();

  if (forecastConfig) {
    const tasks = items.filter((i) => i.type === "task");
    const forecastTasks = tasks.map((t) => {
      const hist = t.estimationHistory ?? [];
      const lastSp = hist.length > 0 ? hist[hist.length - 1].spRemaining : 0;
      return {
        id: t.id,
        status: t.status as "to-do" | "in-progress" | "done",
        spRemaining: lastSp,
        dependsOn: t.dependsOn ?? [],
        assignee: t.assignee ?? null,
        startedAt: t.status === "in-progress" ? t.createdAt?.slice(0, 10) : undefined,
      };
    });

    const result = forecast(forecastTasks, forecastConfig);
    for (const s of result.schedule) {
      forecastMap.set(s.taskId, s);
    }
  }

  // First pass: compute individual task bars
  const barMap = new Map<string, GanttBar>();

  for (const item of items) {
    const start = item.createdAt.slice(0, 10);
    const hist = item.estimationHistory ?? [];
    const fc = forecastMap.get(item.id);

    let end: string;
    let progress: number;
    let isForecast = false;

    if (item.type !== "task") {
      // Objectives and KRs get placeholder values; overridden in second pass
      end = start;
      progress = 0;
      barMap.set(item.id, {
        id: item.id,
        type: item.type,
        name: item.name,
        shortId: item.shortId,
        summary: item.summary,
        start,
        end,
        progress,
        dependsOn: item.dependsOn,
        isForecast: false,
        ...(item.parentId ? { parentId: item.parentId } : {}),
      });
      continue;
    }

    // Task bar computation
    if (item.status === "done") {
      if (hist.length === 0) {
        end = new Date().toISOString().slice(0, 10);
        progress = 100;
      } else {
        end = hist[hist.length - 1].date.slice(0, 10);
        progress = 100;
      }
    } else if (fc) {
      isForecast = true;
      if (item.status === "in-progress") {
        end = fc.projectedEnd;
        if (hist.length > 0) {
          const initialSp = hist[0].spRemaining;
          const lastSp = hist[hist.length - 1].spRemaining;
          progress = initialSp <= 0 ? 0 : Math.round(((initialSp - lastSp) / initialSp) * 100);
        } else {
          progress = 0;
        }
      } else {
        end = fc.projectedEnd;
        progress = 0;
      }
    } else {
      if (hist.length === 0) {
        end = new Date().toISOString().slice(0, 10);
        progress = 0;
      } else {
        end = hist[hist.length - 1].date.slice(0, 10);
        const initialSp = hist[0].spRemaining;
        if (initialSp <= 0) {
          progress = 100;
        } else {
          const burned = initialSp - hist[hist.length - 1].spRemaining;
          progress = Math.round((burned / initialSp) * 100);
        }
      }
    }

    const barStart = fc && item.status === "to-do" ? fc.projectedStart : start;

    barMap.set(item.id, {
      id: item.id,
      type: item.type,
      name: item.name,
      shortId: item.shortId,
      summary: item.summary,
      start: barStart,
      end,
      progress,
      dependsOn: item.dependsOn,
      isForecast,
      ...(item.parentId ? { parentId: item.parentId } : {}),
    });
  }

  // Second pass: derive KR bars from their child tasks
  const krs = items.filter((i) => i.type === "key-result");
  for (const kr of krs) {
    const childTasks = items.filter(
      (i) => i.type === "task" && i.parentId === kr.id
    );
    const krBar = barMap.get(kr.id);
    if (!krBar || childTasks.length === 0) continue;

    let earliest = "";
    let latest = "";
    let anyForecast = false;
    let totalSp = 0;
    let burnedSp = 0;

    for (const t of childTasks) {
      const tBar = barMap.get(t.id);
      if (!tBar) continue;
      earliest = earliest === "" ? tBar.start : minStr(earliest, tBar.start);
      latest = latest === "" ? tBar.end : maxStr(latest, tBar.end);
      if (tBar.isForecast) anyForecast = true;

      const hist = t.estimationHistory ?? [];
      if (hist.length > 0) {
        const initial = hist[0].spRemaining;
        const remaining = hist[hist.length - 1].spRemaining;
        totalSp += initial;
        burnedSp += initial - remaining;
      }
    }

    krBar.start = earliest;
    krBar.end = latest;
    krBar.isForecast = anyForecast;
    krBar.progress = totalSp > 0 ? Math.round((burnedSp / totalSp) * 100) : 0;
  }

  // Third pass: derive objective bars from their child KRs
  const objectives = items.filter((i) => i.type === "objective");
  for (const obj of objectives) {
    const childKrs = items.filter(
      (i) => i.type === "key-result" && i.parentId === obj.id
    );
    const objBar = barMap.get(obj.id);
    if (!objBar || childKrs.length === 0) continue;

    let earliest = "";
    let latest = "";
    let anyForecast = false;
    let totalSp = 0;
    let burnedSp = 0;

    for (const kr of childKrs) {
      const krBar = barMap.get(kr.id);
      if (!krBar) continue;
      earliest = earliest === "" ? krBar.start : minStr(earliest, krBar.start);
      latest = latest === "" ? krBar.end : maxStr(latest, krBar.end);
      if (krBar.isForecast) anyForecast = true;

      // Sum SP from tasks under this KR
      const tasks = items.filter(
        (i) => i.type === "task" && i.parentId === kr.id
      );
      for (const t of tasks) {
        const hist = t.estimationHistory ?? [];
        if (hist.length > 0) {
          const initial = hist[0].spRemaining;
          const remaining = hist[hist.length - 1].spRemaining;
          totalSp += initial;
          burnedSp += initial - remaining;
        }
      }
    }

    objBar.start = earliest;
    objBar.end = latest;
    objBar.isForecast = anyForecast;
    objBar.progress = totalSp > 0 ? Math.round((burnedSp / totalSp) * 100) : 0;
  }

  // Return bars in original item order
  return items.map((item) => barMap.get(item.id)!);
}
