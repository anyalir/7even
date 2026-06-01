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
};

export function computeGanttBars(items: GanttInput[]): GanttBar[] {
  return items.map((item) => {
    const start = item.createdAt.slice(0, 10);
    const hist = item.estimationHistory ?? [];

    let end: string;
    let progress: number;

    if (hist.length === 0) {
      // No estimation data — end is today, progress 0
      end = new Date().toISOString().slice(0, 10);
      progress = item.status === "done" ? 100 : 0;
    } else {
      // End = last estimation entry date
      const lastEntry = hist[hist.length - 1];
      end = lastEntry.date.slice(0, 10);

      // Progress = SP burned / initial SP
      const initialSp = hist[0].spRemaining;
      if (initialSp <= 0) {
        progress = 100;
      } else {
        const burned = initialSp - lastEntry.spRemaining;
        progress = Math.round((burned / initialSp) * 100);
      }
    }

    const bar: GanttBar = {
      id: item.id,
      type: item.type,
      name: item.name,
      shortId: item.shortId,
      summary: item.summary,
      start,
      end,
      progress,
      dependsOn: item.dependsOn,
    };

    if (item.parentId) {
      bar.parentId = item.parentId;
    }

    return bar;
  });
}
