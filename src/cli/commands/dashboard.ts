import { Command } from "commander";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { getGitRoot } from "../../core/git.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/**
 * Resolve the package root directory.
 * Works from both source (src/cli/commands/) and dist (dist/).
 */
function getPackageRoot(): string {
  const thisDir =
    import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
  let dir = thisDir;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "package.json"))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

export function makeDashboardCommand(): Command {
  const cmd = new Command("dashboard")
    .description("Launch the 7even dashboard in your browser")
    .option("-p, --port <number>", "Dashboard port", "7777")
    .action(async (opts) => {
      const port = parseInt(opts.port, 10);
      const gitRoot = getGitRoot();
      const sevenDir = join(gitRoot, ".7even");
      const pkgRoot = getPackageRoot();
      const dashboardDist = join(pkgRoot, "dist", "dashboard");
      const indexHtml = join(dashboardDist, "index.html");

      if (!existsSync(indexHtml)) {
        console.error(
          `Dashboard assets not found at ${dashboardDist}.\n` +
            `This is likely a packaging issue — please report it at https://github.com/anyalir/7even/issues`
        );
        process.exit(1);
      }

      // Import Hono server (bundled by tsup)
      const { createApiServer } = await import(
        "../../dashboard/api/server.js"
      );

      const app = createApiServer(sevenDir);

      // Serve pre-built static dashboard files
      app.use("/*", async (c) => {
        const url = new URL(c.req.url);
        let pathname = url.pathname === "/" ? "/index.html" : url.pathname;
        const filePath = join(dashboardDist, pathname);

        if (existsSync(filePath)) {
          const ext = extname(filePath);
          const mime = MIME[ext] ?? "application/octet-stream";
          const content = readFileSync(filePath);
          return new Response(content, {
            headers: { "Content-Type": mime },
          });
        }

        // SPA fallback — serve index.html for any unknown route
        const index = readFileSync(indexHtml);
        return new Response(index, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      });

      const { serve } = await import("@hono/node-server");
      serve({ fetch: app.fetch, port });

      const url = `http://localhost:${port}`;
      console.log(`Dashboard running at ${url}`);

      // Open in browser
      const opener =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
          ? "start"
          : "xdg-open";
      spawn(opener, [url], { detached: true, stdio: "ignore" }).unref();
    });

  return cmd;
}
