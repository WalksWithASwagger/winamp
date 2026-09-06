import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMediaTool } from "./check-transmission.mjs";
import { readProgramme } from "../examples/playground/src/transmission/score.ts";

export const playground = resolve(dirname(fileURLToPath(import.meta.url)), "../examples/playground");
const sources = [
  { stem: "gorgeous-ghost-now", title: "Gorgeous Ghost (NOW)", alt: "A silver figure suspended inside a golden ring above iridescent spheres." },
  { stem: "the-darks-just-a-door", title: "The Dark’s Just a Door (Remastered)", alt: "A sheet ghost stands on a record among instruments and stage lights." },
  { stem: "gorgeous-ghost", title: "Gorgeous Ghost", alt: "A silver figure floats inside a gold ring among purple spheres and neon paths." },
];

export async function outsideGit(directory) {
  const root = await realpath(directory);
  for (let path = root; ; path = dirname(path)) {
    try {
      await access(join(path, ".git"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      if (dirname(path) === path) return root;
      continue;
    }
    throw new Error("Private proof directories must be outside Git checkouts.");
  }
}

export async function localAsset(root, path) {
  const file = await realpath(resolve(root, path.replace(/^\//, "")));
  const fromRoot = relative(root, file);
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot) || !(await stat(file)).isFile()) {
    throw new Error("Proof asset must be a regular file inside its source directory.");
  }
  return file;
}

export async function fingerprint(file) {
  const bytes = await readFile(file);
  return { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

async function samples(file) {
  const metadata = JSON.parse(await runMediaTool("ffprobe", [
    "-v", "error", "-select_streams", "a", "-show_entries", "stream=duration_ts,time_base,sample_rate,channels", "-of", "json", file,
  ]));
  const stream = metadata.streams?.[0];
  if (metadata.streams?.length !== 1 || stream.sample_rate !== "48000" || stream.channels !== 2 ||
      stream.time_base !== "1/48000" || !Number.isSafeInteger(stream.duration_ts) || stream.duration_ts <= 0) {
    throw new Error("Prepared audio must contain measurable 48 kHz stereo PCM.");
  }
  return stream.duration_ts;
}

export async function prepareTransmission({ publicDir = join(playground, "public"), temporaryRoot = tmpdir() } = {}) {
  const parent = await outsideGit(temporaryRoot);
  const sourceRoot = await realpath(publicDir);
  const tools = {
    ffmpeg: (await runMediaTool("ffmpeg", ["-version"])).split("\n")[0],
    ffprobe: (await runMediaTool("ffprobe", ["-version"])).split("\n")[0],
  };
  const root = await mkdtemp(join(parent, "ghost-transmission-proof-"));
  try {
    await mkdir(join(root, "audio"));
    await mkdir(join(root, "art"));
    const parts = await mkdtemp(join(root, "parts-"));
    const inputs = [];
    const chapters = [];
    const sourceReceipt = [];
    let totalSamples = 0;
    for (const [index, source] of sources.entries()) {
      const audioPath = `/audio/${source.stem}.mp3`;
      const image = `/art/${source.stem}.jpg`;
      const audioFile = await localAsset(sourceRoot, audioPath);
      const artFile = await localAsset(sourceRoot, image);
      const original = await fingerprint(audioFile);
      const part = join(parts, `${index}.wav`);
      await runMediaTool("ffmpeg", [
        "-nostdin", "-v", "error", "-xerror", "-protocol_whitelist", "file", "-format_whitelist", "mp3",
        "-i", audioFile, "-map", "0:a:0", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", "-map_metadata", "-1", part,
      ]);
      const count = await samples(part);
      chapters.push({ at: totalSamples / 48000, title: source.title, image, alt: source.alt });
      totalSamples += count;
      inputs.push("-i", part);
      await copyFile(artFile, join(root, image.slice(1)));
      if ((await fingerprint(audioFile)).sha256 !== original.sha256) throw new Error("Source changed during preparation.");
      sourceReceipt.push({ path: audioPath, ...original, decodedSamples: count, decodedDuration: count / 48000 });
    }
    const audioUrl = "/audio/proof-programme.wav";
    const output = join(root, audioUrl.slice(1));
    await runMediaTool("ffmpeg", [
      "-nostdin", "-v", "error", "-xerror", ...inputs,
      "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1[out]", "-map", "[out]",
      "-c:a", "pcm_s16le", "-map_metadata", "-1", output,
    ]);
    if (await samples(output) !== totalSamples) throw new Error("Programme sample count differs from its sources.");
    await runMediaTool("ffmpeg", ["-nostdin", "-v", "error", "-xerror", "-i", output, "-f", "null", "-"]);
    const programme = readProgramme({ audioUrl, duration: totalSamples / 48000, credits: "Kris Krüg — source catalogue attribution; pending editorial approval.", chapters });
    const manifest = JSON.stringify({ status: "unapproved", programme }, null, 2) + "\n";
    await writeFile(join(root, "transmission-proof.json"), manifest);
    const assets = [];
    for (const path of [audioUrl, ...chapters.map((chapter) => chapter.image)]) {
      assets.push({ path, ...await fingerprint(join(root, path.slice(1))) });
    }
    await writeFile(join(root, "review.json"), JSON.stringify({
      status: "unapproved", tools, sources: sourceReceipt, assets,
      manifestSha256: createHash("sha256").update(manifest).digest("hex"),
      duration: programme.duration, samples: totalSamples, sampleRate: 48000,
      process: "Catalogue order; decoded to stereo 48 kHz 16-bit PCM; hard joins; no trimming, crossfades or normalization.",
      reviewRequired: ["Full audible review and sequence approval", "Artwork, chapter titles and credits", "Authentic 15–30-second creator recording and transcript", "Final delivery encoding and release gate", "Physical iOS and listener checks"],
    }, null, 2) + "\n");
    await rm(parts, { recursive: true });
    return root;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(await prepareTransmission()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
