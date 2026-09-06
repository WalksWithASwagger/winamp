import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static entrypoints share the provider bundle. Netlify routes use public/_redirects.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        classic: "classic.html",
        transmission: "transmission-001.html",
      },
    },
  },
});
