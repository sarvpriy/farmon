import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
// import { LOOMA_ROOT_DIR } from "../looma-internal-configs";

// https://vite.dev/config/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,

  base: "/ui/",

  build: {
    outDir: path.resolve(__dirname, "../dist/ui"),
    emptyOutDir: true,
  },

  plugins: [
    react(),
    tailwindcss(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],

  resolve: {
    alias: {
      "@ui": path.resolve(__dirname, "src"),
      "@schemas": path.resolve(__dirname, "../schemas"),
    },
  },
});
