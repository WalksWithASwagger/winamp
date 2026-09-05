import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkTransmission } from "../scripts/check-transmission.mjs";
import { transmissionFixture } from "./fixtures/transmission";

function tone(seconds: number, frequency: number) {
  const rate = 8000;
  const bytes = seconds * rate * 2;
  const wav = Buffer.alloc(44 + bytes);
  wav.write("RIFF"); wav.writeUInt32LE(bytes + 36, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(bytes, 40);
  for (let i = 0; i < seconds * rate; i++) wav.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * frequency / rate) * 400), 44 + i * 2);
  return wav;
}

let root: string;
let release: typeof transmissionFixture;
const manifest = () => writeFile(join(root, "transmission-001.json"), JSON.stringify({ release }));

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "transmission-release-"));
  release = structuredClone(transmissionFixture);
  await mkdir(join(root, "audio"));
  await mkdir(join(root, "art"));
  await writeFile(join(root, "audio/test-programme.wav"), tone(30, 220));
  await writeFile(join(root, "audio/test-note.wav"), tone(15, 440));
  for (const chapter of release.chapters) await copyFile(`examples/playground/public${chapter.image}`, join(root, chapter.image.slice(1)));
  await manifest();
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }); });

describe("transmission media release gate", () => {
  it("decodes real media and produces hashes and measured durations without modifying assets", async () => {
    const original = await readFile(join(root, "audio/test-programme.wav"));
    const report = await checkTransmission(root);
    expect(report.assets[0]).toMatchObject({
      path: release.audioUrl, duration: 30, bytes: original.length,
      sha256: createHash("sha256").update(original).digest("hex"),
    });
    expect(report.assets[1].duration).toBe(15);
    expect(report.tools.ffmpeg).toContain("ffmpeg version");
    expect(report.manifestSha256).toBe(createHash("sha256").update(await readFile(join(root, "transmission-001.json"))).digest("hex"));
    expect(report.reviewRequired).toContain("Content approval");
    expect(await readFile(join(root, "audio/test-programme.wav"))).toEqual(original);
  });
  it("verifies the existing MP3 with a rounded measured duration", async () => {
    release.audioUrl = "/audio/programme.mp3";
    release.duration = 70.69;
    await copyFile("examples/playground/public/audio/gorgeous-ghost-now.mp3", join(root, "audio/programme.mp3"));
    await manifest();
    const report = await checkTransmission(root);
    expect(report.assets[0]).toMatchObject({ codec: "mp3", path: release.audioUrl });
    // FFmpeg 6 and 8 report encoder padding differently; both must meet the release tolerance.
    expect(Math.abs(report.assets[0].duration - release.duration)).toBeLessThanOrEqual(0.05);
  });
  it("keeps pending content blocked even when media tools are unavailable", async () => {
    await writeFile(join(root, "transmission-001.json"), '{"release":null}');
    vi.stubEnv("PATH", "");
    await expect(checkTransmission(root)).rejects.toThrow("Release blocked: approved programme master");
  });
  it("reports missing tools as unavailable rather than successful verification", async () => {
    vi.stubEnv("PATH", "");
    await expect(checkTransmission(root)).rejects.toThrow("ffprobe is required on PATH");
  });
  it("rejects a manifest whose declared end would outlast the recording", async () => {
    release.duration = 30.2;
    await manifest();
    await expect(checkTransmission(root)).rejects.toThrow("differs from measured duration 30s");
  });
  it("rejects artist audio shorter than its declared minimum", async () => {
    await writeFile(join(root, "audio/test-note.wav"), tone(14, 440));
    await expect(checkTransmission(root)).rejects.toThrow("measured duration is outside");
  });
  it("rejects corrupt recordings despite a valid manifest and existing file", async () => {
    await writeFile(join(root, "audio/test-programme.wav"), "not audio");
    await expect(checkTransmission(root)).rejects.toThrow("/audio/test-programme.wav: ffprobe failed");
  });
  it("rejects damaged audio that ffprobe can inspect but ffmpeg cannot fully decode", async () => {
    release.audioUrl = "/audio/damaged.mp3";
    release.duration = 70.69;
    const damaged = await readFile("examples/playground/public/audio/gorgeous-ghost-now.mp3");
    const middle = Math.floor(damaged.length / 2);
    damaged.fill(0xff, middle, middle + 1024);
    await writeFile(join(root, "audio/damaged.mp3"), damaged);
    await manifest();
    await expect(checkTransmission(root)).rejects.toThrow("/audio/damaged.mp3: ffmpeg failed");
  });
  it("rejects media whose actual format does not match its public extension", async () => {
    release.audioUrl = "/audio/programme.mp3";
    await copyFile(join(root, "audio/test-programme.wav"), join(root, "audio/programme.mp3"));
    await manifest();
    await expect(checkTransmission(root)).rejects.toThrow("Audio format");
  });
  it("rejects a copy of the programme masquerading as the creator note", async () => {
    release.duration = 15;
    release.chapters.forEach((chapter, i) => { chapter.at = i * 5; });
    await writeFile(join(root, "audio/test-programme.wav"), tone(15, 220));
    await copyFile(join(root, "audio/test-programme.wav"), join(root, "audio/test-note.wav"));
    await manifest();
    await expect(checkTransmission(root)).rejects.toThrow("distinct recordings");
  });
  it("rejects missing chapter artwork", async () => {
    await rm(join(root, release.chapters[0].image.slice(1)));
    await expect(checkTransmission(root)).rejects.toThrow(release.chapters[0].image);
  });
  it("does not follow an asset symlink outside the public directory", async () => {
    await rm(join(root, "audio/test-programme.wav"));
    await symlink(process.execPath, join(root, "audio/test-programme.wav"));
    await expect(checkTransmission(root)).rejects.toThrow("Asset resolves outside");
  });
});
