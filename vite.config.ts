import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves from https://<user>.github.io/localshield-hybrid-ai/
const base = process.env.GITHUB_ACTIONS ? "/localshield-hybrid-ai/" : "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
