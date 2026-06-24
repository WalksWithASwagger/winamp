// tsup/esbuild strips the module-level "use client" directive while bundling.
// The whole package is client-only, so re-prepend it to the JS bundles after
// build — this keeps it a client module under the Next.js App Router / RSC.
import { readFileSync, writeFileSync } from "node:fs";

const DIRECTIVE = '"use client";\n';

for (const file of ["dist/index.js", "dist/index.cjs"]) {
  const code = readFileSync(file, "utf8");
  if (code.startsWith('"use client"') || code.startsWith("'use client'")) continue;
  writeFileSync(file, DIRECTIVE + code);
  console.log(`prepended "use client" to ${file}`);
}
