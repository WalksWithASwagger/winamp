import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // The whole package is client-only (Web Audio, framer-motion, Butterchurn).
  // esbuild strips the "use client" directive while bundling, so it's
  // re-prepended in a post-build step (scripts/add-use-client.mjs).
  external: ["react", "react-dom"],
});
