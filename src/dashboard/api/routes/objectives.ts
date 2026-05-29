import { Hono } from "hono";
import { readIndex } from "../../../core/index-manager.js";
import { readItem, listItems } from "../../../core/storage.js";

export function objectivesRoute(sevenDir: string) {
  const route = new Hono();

  route.get("/", async (c) => {
    const objectives = await listItems(sevenDir, "objective");
    const keyResults = await listItems(sevenDir, "key-result");
    const tasks = await listItems(sevenDir, "task");

    const result = objectives.map((obj) => {
      const krs = keyResults
        .filter((kr) => kr.data.parentId === obj.id)
        .map((kr) => {
          const krTasks = tasks
            .filter((t) => t.data.parentId === kr.id)
            .map((t) => ({ id: t.id, ...t.data }));
          return { id: kr.id, ...kr.data, tasks: krTasks };
        });
      return { id: obj.id, ...obj.data, keyResults: krs };
    });

    return c.json(result);
  });

  return route;
}
