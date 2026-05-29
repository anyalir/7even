import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli/index.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  shims: true,
  dts: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
