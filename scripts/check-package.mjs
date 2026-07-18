import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function collectTargets(value, targets) {
  if (typeof value === "string") {
    targets.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectTargets(item, targets);
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectTargets(item, targets);
  }
}

export function requiredPackageFiles(packageJson) {
  const targets = new Set();
  collectTargets(packageJson.exports, targets);

  for (const field of ["main", "module", "types"]) {
    collectTargets(packageJson[field], targets);
  }

  const files = new Set();
  for (const target of targets) {
    const file = target.replace(/^\.\//, "");
    files.add(file);
    if (/\.(?:cjs|mjs|js)$/.test(file)) files.add(`${file}.map`);
  }

  return [...files].sort();
}

export function missingPackageFiles(packageJson, packedFiles) {
  const manifest = new Set(packedFiles);
  return requiredPackageFiles(packageJson).filter((file) => !manifest.has(file));
}

export function assertPackageIntegrity(packageJson, packedFiles) {
  const missing = missingPackageFiles(packageJson, packedFiles);
  if (missing.length > 0) {
    throw new Error(`Package tarball is missing required files:\n${missing.join("\n")}`);
  }
}

async function main() {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
  const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"], {
    cwd: rootDir,
  });
  const [packResult] = JSON.parse(stdout);
  if (!packResult?.files) throw new Error("npm pack did not return a file manifest");

  assertPackageIntegrity(
    packageJson,
    packResult.files.map(({ path: file }) => file),
  );
  console.log(`Package contains all ${requiredPackageFiles(packageJson).length} required files.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
