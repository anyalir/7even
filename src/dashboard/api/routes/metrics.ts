import { Hono } from "hono";
import { listItems, getConfig } from "../../../core/storage.js";
import { calculateVelocity, computeTeamVelocity } from "../../../metrics/velocity.js";
import { computeBurndown } from "../../../metrics/burndown.js";
import { computeGanttBars } from "../../../metrics/gantt.js";
import type { GanttInput } from "../../../metrics/gantt.js";
import { getTaskCommits } from "../../../core/git.js";
import type { ForecastConfig } from "../../../metrics/forecast.js";

export function metricsRoute(sevenDir: string) {
  const route = new Hono();

  route.get("/velocity", async (c) => {
    const config = await getConfig(sevenDir);
    const tasks = await listItems(sevenDir, "task");
    const doneTasks = tasks
      .filter((t) => t.data.status === "done")
      .map((t) => t.data);
    const velocity = calculateVelocity(doneTasks, 7, config.teamSize);
    const teamVelocity = computeTeamVelocity(velocity);
    return c.json({
      windows: velocity,
      teamSize: config.teamSize,
      teamVelocity,
      initialVelocity: config.initialVelocity,
    });
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
    const config = await getConfig(sevenDir);
    const objectives = await listItems(sevenDir, "objective");
    const keyResults = await listItems(sevenDir, "key-result");
    const tasks = await listItems(sevenDir, "task");

    // Compute velocity for forecast
    const doneTasks = tasks
      .filter((t) => t.data.status === "done")
      .map((t) => t.data);
    const velocityWindows = calculateVelocity(doneTasks, 7, config.teamSize);
    const computedVelocity = computeTeamVelocity(velocityWindows);

    const forecastConfig: ForecastConfig = {
      teamSize: config.teamSize,
      initialVelocity: config.initialVelocity,
      computedVelocity,
    };

    const items: GanttInput[] = [
      ...objectives.map((o) => ({
        id: o.id,
        type: "objective" as const,
        name: o.data.description,
        shortId: o.data.shortId,
        summary: o.data.summary,
        createdAt: o.data.createdAt,
        status: o.data.status,
      })),
      ...keyResults.map((kr) => ({
        id: kr.id,
        type: "key-result" as const,
        name: kr.data.description,
        shortId: kr.data.shortId,
        summary: kr.data.summary,
        createdAt: kr.data.createdAt,
        status: kr.data.status,
        parentId: kr.data.parentId,
      })),
      ...tasks.map((t) => ({
        id: t.id,
        type: "task" as const,
        name: t.data.description,
        shortId: t.data.shortId,
        createdAt: t.data.createdAt,
        status: t.data.status,
        estimationHistory: t.data.estimationHistory,
        parentId: t.data.parentId,
        dependsOn: t.data.dependsOn,
        assignee: t.data.assignee?.email ?? null,
      })),
    ];

    const bars = computeGanttBars(items, forecastConfig);
    return c.json(bars);
  });

  route.get("/config", async (c) => {
    const config = await getConfig(sevenDir);
    return c.json(config);
  });

  route.get("/commits/:taskId", async (c) => {
    const taskId = c.req.param("taskId");
    const commits = getTaskCommits(taskId);
    return c.json(commits);
  });

  route.get("/commits", async (c) => {
    const tasks = await listItems(sevenDir, "task");
    const allCommits: Array<{ hash: string; date: string; message: string; taskId: string; taskName: string }> = [];
    for (const t of tasks) {
      const commits = getTaskCommits(t.id);
      for (const commit of commits) {
        allCommits.push({ ...commit, taskId: t.id, taskName: t.data.description });
      }
    }
    allCommits.sort((a, b) => a.date.localeCompare(b.date));
    return c.json(allCommits);
  });

  return route;
}
