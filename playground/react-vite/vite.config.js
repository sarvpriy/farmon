import { defineConfig } from "vite";
// import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { farmonVitePlugin } from "farmon/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [farmonVitePlugin(), react()],
});

// vite/plugin.ts
