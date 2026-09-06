import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fingerprint, outsideGit, playground, prepareTransmission } from "../scripts/prepare-transmission.mjs";
import { buildProof } from "../scripts/preview-transmission.mjs";
import { checkTransmission } from "../scripts/check-transmission.mjs";

let temporaryRoot: string;
beforeEach(async () => { temporaryRoot = await mkdtemp(join(tmpdir(), "transmission-proof-test-")); });
afterEach(async () => { vi.unstubAllEnvs(); await rm(temporaryRoot, { recursive: true, force: true }); });

it("assembles the real catalogue with exact sample boundaries, unchanged sources and repeatable media", async () => {
  const first = await prepareTransmission({ temporaryRoot });
  const second = await prepareTransmission({ temporaryRoot });
  expect(first).not.toBe(second);
  const proof = JSON.parse(await readFile(join(first, "transmission-proof.json"), "utf8"));
  const review = JSON.parse(await readFile(join(first, "review.json"), "utf8"));
  expect(proof.status).toBe("unapproved");
  expect(proof.programme.note).toBeUndefined();
  expect(proof.programme.duration).toBeGreaterThan(260);
  expect(proof.programme.duration).toBeLessThan(265);
  let samples = 0;
  for (const [index, source] of review.sources.entries()) {
    expect(proof.programme.chapters[index].at).toBe(samples / 48000);
    samples += source.decodedSamples;
    expect(await fingerprint(join(playground, "public", source.path.slice(1)))).toEqual({ bytes: source.bytes, sha256: source.sha256 });
  }
  expect(review.samples).toBe(samples);
  expect(proof.programme.duration).toBe(samples / 48000);
  expect(await fingerprint(join(first, "audio/proof-programme.wav"))).toEqual(await fingerprint(join(second, "audio/proof-programme.wav")));
  expect((await readdir(first)).some((file) => file.startsWith("parts-"))).toBe(false);
  expect(await readFile(join(playground, "public/transmission-001.json"), "utf8")).toContain('"release": null');
  await expect(checkTransmission()).rejects.toThrow("Release blocked");
}, 20_000);

it("builds only receipted proof assets, excluding unrelated private files and normal public assets", async () => {
  const root = await prepareTransmission({ temporaryRoot });
  await writeFile(join(root, "private-draft.txt"), "Do not serve this file.");
  // Vite/esbuild runs in Node, not jsdom's separate typed-array realm.
  const { stdout } = await promisify(execFile)(process.execPath, ["--input-type=module", "-e",
    'import { buildProof } from "./scripts/preview-transmission.mjs"; console.log(await buildProof(process.argv[1]));', root]);
  const site = stdout.trim().split("\n").at(-1)!;
  expect(await readFile(join(site, "proof.html"), "utf8")).toContain("Private proof — Transmission 001");
  expect(await fingerprint(join(site, "audio/proof-programme.wav"))).toEqual(await fingerprint(join(root, "audio/proof-programme.wav")));
  for (const name of ["private-draft.txt", "transmission-001.json", "index.html", "audio/gorgeous-ghost.mp3"]) {
    await expect(readFile(join(site, name))).rejects.toMatchObject({ code: "ENOENT" });
  }
  await writeFile(join(root, "audio/proof-programme.wav"), "changed");
  await expect(buildProof(root)).rejects.toThrow("Proof asset changed");
}, 20_000);

it("rejects Git-contained output and symlink escapes", async () => {
  await expect(prepareTransmission({ temporaryRoot: playground })).rejects.toThrow("outside Git");
  const nested = join(temporaryRoot, "checkout");
  await mkdir(nested);
  await writeFile(join(nested, ".git"), "gitdir: elsewhere");
  await symlink(nested, join(temporaryRoot, "alias"));
  await expect(outsideGit(join(temporaryRoot, "alias"))).rejects.toThrow("outside Git");
  const root = await prepareTransmission({ temporaryRoot });
  await rm(join(root, "audio/proof-programme.wav"));
  await symlink(join(playground, "public/audio/gorgeous-ghost.mp3"), join(root, "audio/proof-programme.wav"));
  await expect(buildProof(root)).rejects.toThrow("inside its source directory");
}, 10_000);

it("fails missing or corrupt sources and unavailable media tools without leaving a misleading proof", async () => {
  const source = join(temporaryRoot, "source");
  await mkdir(join(source, "audio"), { recursive: true });
  await mkdir(join(source, "art"));
  await expect(prepareTransmission({ temporaryRoot, publicDir: source })).rejects.toThrow();
  await writeFile(join(source, "audio/gorgeous-ghost-now.mp3"), "invalid audio");
  await copyFile(join(playground, "public/art/gorgeous-ghost-now.jpg"), join(source, "art/gorgeous-ghost-now.jpg"));
  await expect(prepareTransmission({ temporaryRoot, publicDir: source })).rejects.toThrow("ffmpeg failed");
  expect(await readdir(temporaryRoot)).toEqual(["source"]);
  vi.stubEnv("PATH", temporaryRoot);
  await expect(prepareTransmission({ temporaryRoot })).rejects.toThrow("required on PATH");
});
