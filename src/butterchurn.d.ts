// butterchurn + butterchurn-presets ship no types; they are loaded only via
// browser-only dynamic import() inside Visualizer.tsx (the lib touches `window`
// at module top, so it must never run on the server).
declare module "butterchurn";
declare module "butterchurn-presets/lib/butterchurnPresetsMinimal.min.js";
