import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { readRelease } from "../examples/playground/src/transmission/score.ts";

const run = promisify(execFile);
const defaultPublicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../examples/playground/public");

async function tool(command, args) {
  try {
    return (await run(command, args, { timeout: 60_000, maxBuffer: 1024 * 1024 })).stdout;
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`Media verification unavailable: ${command} is required on PATH.`);
    throw new Error(`${command} failed: ${error.killed ? "timed out" : "media could not be inspected or decoded"}.`);
  }
}

async function inspectAudio(file, assetPath, declaredDuration, minimum, maximum) {
  const metadata = JSON.parse(await tool("ffprobe", [
    "-v", "error", "-protocol_whitelist", "file", "-format_whitelist", "mp3,wav", "-select_streams", "a", "-show_entries",
    "format=duration,format_name:stream=codec_name", "-of", "json", file,
  ]));
  const duration = Number(metadata.format?.duration);
  const format = assetPath.endsWith(".mp3") ? "mp3" : "wav";
  if (metadata.streams?.length !== 1 || metadata.format?.format_name !== format ||
      !Number.isFinite(duration) || duration <= 0 || duration < minimum || duration > maximum) {
    throw new Error("Audio format, stream count or measured duration is outside the release contract.");
  }
  // The completion UI allows 100 ms; a rounded manifest must not miss that boundary.
  if (Math.abs(duration - declaredDuration) > 0.05) {
    throw new Error(`Declared duration ${declaredDuration}s differs from measured duration ${duration}s by more than 0.05s.`);
  }
  await tool("ffmpeg", [
    "-nostdin", "-v", "error", "-xerror", "-protocol_whitelist", "file", "-format_whitelist", "mp3,wav",
    "-i", file, "-map", "0:a:0", "-f", "null", "-",
  ]);
  return { duration, codec: metadata.streams[0].codec_name };
}

export async function checkTransmission(publicDir = defaultPublicDir) {
  const root = await realpath(publicDir);
  const manifestBytes = await readFile(resolve(root, "transmission-001.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const release = readRelease(manifest);
  if (!release) throw new Error("Release blocked: approved programme master, artist note, transcript, credits and final chapter score are not supplied.");
  const assets = [];
  for (const path of new Set([release.audioUrl, release.note.audioUrl, ...release.chapters.map((chapter) => chapter.image)])) {
    try {
      const file = await realpath(resolve(root, path.slice(1)));
      const fromRoot = relative(root, file);
      if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) throw new Error("Asset resolves outside the public directory.");
      const info = await stat(file);
      if (!info.isFile() || !info.size) throw new Error("Asset must be a nonempty regular file.");
      const audio = path === release.audioUrl
        ? await inspectAudio(file, path, release.duration, 0, 300)
        : path === release.note.audioUrl ? await inspectAudio(file, path, release.note.duration, 15, 30) : {};
      assets.push({ path, bytes: info.size, sha256: createHash("sha256").update(await readFile(file)).digest("hex"), ...audio });
    } catch (error) {
      throw new Error(`${path}: ${error.message}`);
    }
  }
  if (assets[0].sha256 === assets[1].sha256) throw new Error("Programme and artist note must contain distinct recordings.");
  return {
    manifestSha256: createHash("sha256").update(manifestBytes).digest("hex"),
    tools: {
      ffprobe: (await tool("ffprobe", ["-version"])).split("\n")[0],
      ffmpeg: (await tool("ffmpeg", ["-version"])).split("\n")[0],
    },
    assets,
    reviewRequired: "Content approval, artwork review, audible listening, browser seekability, physical iOS and listener checks remain required.",
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await checkTransmission(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
