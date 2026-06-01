import { Command } from "commander";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { getGitRoot } from "../../core/git.js";

/**
 * Resolve the package root directory.
 * Works from both source (src/cli/commands/) and dist (dist/).
 */
function getPackageRoot(): string {
  const thisDir =
    import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
  // Walk up until we find package.json
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
    .option("-p, --port <number>", "Vite dev server port", "7777")
    .action(async (opts) => {
      const port = parseInt(opts.port, 10);
      const apiPort = 7778;
      const gitRoot = getGitRoot();
      const sevenDir = join(gitRoot, ".7even");
      const pkgRoot = getPackageRoot();
      const dashboardDir = resolve(pkgRoot, "src/dashboard");
      const viteConfig = resolve(dashboardDir, "vite.config.ts");

      if (!existsSync(viteConfig)) {
        console.error(
          `Dashboard source not found at ${dashboardDir}.\nRun from the 7even project root.`
        );
        process.exit(1);
      }

      // Start API server
      const { startApiServer } = await import(
        "../../dashboard/api/server.js"
      );
      startApiServer(sevenDir, apiPort);
      console.log(`API server: http://localhost:${apiPort}`);

      // Start Vite dev server
      const { createServer } = await import("vite");
      const vite = await createServer({
        configFile: viteConfig,
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
