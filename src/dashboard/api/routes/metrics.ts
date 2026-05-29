import { Hono } from "hono";
import { listItems } from "../../../core/storage.js";
import { calculateVelocity } from "../../../metrics/velocity.js";
import { computeBurndown } from "../../../metrics/burndown.js";
import { computeGanttBars } from "../../../metrics/gantt.js";
import type { GanttInput } from "../../../metrics/gantt.js";

export function metricsRoute(sevenDir: string) {
  const route = new Hono();

  route.get("/velocity", async (c) => {
    const tasks = await listItems(sevenDir, "task");
    const doneTasks = tasks
      .filter((t) => t.data.status === "done")
      .map((t) => t.data);
    const velocity = calculateVelocity(doneTasks);
    return c.json(velocity);
  });

  route.get("/burndown/:krId", async (c) => {
    const krId = c.req.param("krId");
    const tasks = await listItems(sevenDir, "task");
    const krTasks = tasks
      .filter((t) => t.data.parentId === krId)
      .map((t) => t.data);
    const burndown = computeBurndown(krTasks);
    return c.json(burndown);
  });

  route.get("/gantt", async (c) => {
    const objectives = await listItems(sevenDir, "objective");
    const keyResults = await listItems(sevenDir, "key-result");
    const tasks = await listItems(sevenDir, "task");

    const items: GanttInput[] = [
      ...objectives.map((o) => ({
        id: o.id,
        type: "objective" as const,
        name: o.data.name,
        createdAt: o.data.createdAt,
        status: o.data.status,
      })),
      ...keyResults.map((kr) => ({
        id: kr.id,
        type: "key-result" as const,
        name: kr.data.name,
        createdAt: kr.data.createdAt,
        status: kr.data.status,
        parentId: kr.data.parentId,
      })),
      ...tasks.map((t) => ({
        id: t.id,
        type: "task" as const,
        name: t.data.name,
        createdAt: t.data.createdAt,
        status: t.data.status,
        estimationHistory: t.data.estimationHistory,
        parentId: t.data.parentId,
      })),
    ];

    const bars = computeGanttBars(items);
    return c.json(bars);
  });

  return route;
}
