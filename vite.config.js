import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // During local dev (npm run dev / netlify dev), proxy /api calls
  // to the Netlify CLI dev server which runs the functions.
  // This block is ignored in production builds.
  server: {
    proxy: {
      "/api": "http://localhost:8888",
    },
  },
});
