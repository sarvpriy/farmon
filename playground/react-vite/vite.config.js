import { defineConfig } from "vite";
// import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { farmonVitePlugin } from "farmon/vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [farmonVitePlugin(), tailwindcss(), react()],
});

// vite/plugin.ts
