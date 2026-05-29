import { Command } from "commander";
import { resolve, join } from "node:path";
import { getGitRoot } from "../../core/git.js";

export function makeDashboardCommand(): Command {
  const cmd = new Command("dashboard")
    .description("Launch the 7even dashboard in your browser")
    .option("-p, --port <number>", "Vite dev server port", "7777")
    .action(async (opts) => {
      const port = parseInt(opts.port, 10);
      const apiPort = 7778;
      const gitRoot = getGitRoot();
      const sevenDir = join(gitRoot, ".7even");

      // Start API server
      const { startApiServer } = await import(
        "../../dashboard/api/server.js"
      );
      startApiServer(sevenDir, apiPort);
      console.log(`API server: http://localhost:${apiPort}`);

      // Start Vite dev server
      const { createServer } = await import("vite");
      const vite = await createServer({
        configFile: resolve(
          import.meta.dirname ?? new URL(".", import.meta.url).pathname,
          "../../dashboard/vite.config.ts"
        ),
        server: {
          port,
          open: true,
        },
      });
      await vite.listen();
      console.log(`Dashboard: http://localhost:${port}`);
    });

  return cmd;
}
