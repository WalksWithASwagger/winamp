import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readRelease } from "../examples/playground/src/transmission/score.ts";

const publicDir = new URL("../examples/playground/public/", import.meta.url);
try {
  const manifest = JSON.parse(await readFile(new URL("transmission-001.json", publicDir), "utf8"));
  const release = readRelease(manifest);
  if (!release) throw new Error("Release blocked: approved programme master, artist note, transcript, credits and final chapter score are not supplied.");
  for (const path of [release.audioUrl, release.note.audioUrl, ...release.chapters.map((chapter) => chapter.image)]) {
    await access(fileURLToPath(new URL(path.slice(1), publicDir)));
  }
  console.log("Transmission release manifest and local assets verified. Human listening and content approval remain required.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
