import { copyFile, mkdir, mkdtemp, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readProgramme } from "../examples/playground/src/transmission/score.ts";
import { fingerprint, localAsset, outsideGit, playground, prepareTransmission } from "./prepare-transmission.mjs";

const require = createRequire(join(playground, "package.json"));

export async function buildProof(directory) {
  const root = await outsideGit(directory);
  const manifest = await localAsset(root, "transmission-proof.json");
  const receipt = await localAsset(root, "review.json");
  const proof = JSON.parse(await readFile(manifest, "utf8"));
  const review = JSON.parse(await readFile(receipt, "utf8"));
  if (proof.status !== "unapproved" || review.status !== "unapproved" ||
      review.manifestSha256 !== (await fingerprint(manifest)).sha256) throw new Error("Proof manifest does not match its review receipt.");
  const programme = readProgramme(proof.programme);
  const files = [["transmission-proof.json", manifest], ["review.json", receipt]];
  for (const path of new Set([programme.audioUrl, ...programme.chapters.map((chapter) => chapter.image)])) {
    const file = await localAsset(root, path);
    const expected = review.assets?.find((asset) => asset.path === path);
    const actual = await fingerprint(file);
    if (!expected || expected.sha256 !== actual.sha256 || expected.bytes !== actual.bytes) throw new Error(`Proof asset changed: ${path}`);
    files.push([path.slice(1), file]);
  }
  const site = await mkdtemp(join(root, "site-"));
  const { build } = await import(require.resolve("vite"));
  const { default: react } = await import(require.resolve("@vitejs/plugin-react"));
  await build({
    configFile: false, envDir: false, root: playground, publicDir: false, plugins: [react()],
    build: { outDir: site, emptyOutDir: false, rollupOptions: { input: join(playground, "proof.html") } },
  });
  for (const [path, source] of files) {
    await mkdir(dirname(join(site, path)), { recursive: true });
    await copyFile(source, join(site, path));
  }
  return site;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const directory = process.argv.slice(2).filter((arg) => arg !== "--")[0] ?? await prepareTransmission();
    const site = await buildProof(directory);
    const { preview } = await import(require.resolve("vite"));
    const server = await preview({
      configFile: false, envDir: false, root: playground, publicDir: false,
      build: { outDir: site }, preview: { host: "127.0.0.1", port: 4175, strictPort: true, cors: false },
    });
    console.log(`Private proof: http://127.0.0.1:4175/proof.html\nSource and receipt: ${directory}\nUnapproved; local review only. Ctrl-C stops the preview.`);
    const stop = () => server.httpServer.close(() => process.exit(0));
    process.on("SIGINT", stop); process.on("SIGTERM", stop);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
