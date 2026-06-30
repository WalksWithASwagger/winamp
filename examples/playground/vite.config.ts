import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Two pages from one build: the hub (index.html) and the standalone
// classic .wsz booth (classic.html, served at /classic via public/_redirects).
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        classic: "classic.html",
      },
    },
  },
});
