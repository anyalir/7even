import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { objectivesRoute } from "./routes/objectives.js";
import { tasksRoute } from "./routes/tasks.js";
import { metricsRoute } from "./routes/metrics.js";
import { badgesRoute } from "./routes/badges.js";

export function createApiServer(sevenDir: string) {
  const app = new Hono();

  app.route("/api/objectives", objectivesRoute(sevenDir));
  app.route("/api/tasks", tasksRoute(sevenDir));
  app.route("/api/metrics", metricsRoute(sevenDir));
  app.route("/api/badges", badgesRoute(sevenDir));

  return app;
}

export function startApiServer(sevenDir: string, port = 7778) {
  const app = createApiServer(sevenDir);
  const server = serve({ fetch: app.fetch, port });
  return server;
}
