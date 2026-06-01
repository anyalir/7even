import { Hono } from "hono";
import { listItems } from "../../../core/storage.js";

export function tasksRoute(sevenDir: string) {
  const route = new Hono();

  route.get("/", async (c) => {
    const tasks = await listItems(sevenDir, "task");
    const result = tasks.map((t) => ({ id: t.id, ...t.data, name: t.data.description }));
    return c.json(result);
  });

  return route;
}
