import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts", "server/run.ts", "bin/farmon.ts"],
  outDir: "dist",
  format: ["esm"],
  bundle: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  target: "node22",
});
