// Regenerate src/tracks.ts from Kris's public Suno playlists.
// Usage:  node examples/playground/scripts/sync-suno.mjs
//
// Suno's playlist API is public (no auth) and the CDN sends
// `access-control-allow-origin: *`, so we reference the CDN URLs directly —
// the Web Audio visualizer/EQ work and we commit zero audio. Edit a playlist
// on Suno, re-run this, rebuild + deploy. Gorgeous Ghost is local audio and is
// kept verbatim below.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "tracks.ts",
);

// Suno playlists → station metadata. Add/reorder here to change the dial.
const PLAYLISTS = [
  {
    id: "31d50378-b496-48a1-882c-06337f3d32db",
    varName: "tooWeirdToDie",
    comment: "Too Weird to Die — Kris Krüg (Suno)",
    accent: "#e0734d",
    person: () => "Kris Krüg",
    cleanTitle: (t) => t.replace(/^\s*\d+\.\s*/, "").trim(),
    station: { id: "too-weird", freq: "88.1", name: "BOTH HANDS FULL", desc: "Too Weird to Die — the record.", href: "https://bothhandsfull.com" },
  },
  {
    id: "609f567a-672c-4159-9909-10984f401e50",
    varName: "ethosBlockParty",
    comment: "Ethọ́s Lab Block Party 2026 (Suno)",
    accent: "#f2a13d",
    person: (t) => { const m = t.match(/[-—]\s*([^-—]+)\s*$/); return m ? m[1].trim() : "Ethọ́s Lab"; },
    cleanTitle: (t) => t.split("·")[0].trim(),
    station: { id: "ethos", freq: "92.3", name: "ETHOS BLOCK PARTY", desc: "Ethọ́s Lab Block Party 2026.", href: "https://ethosblockparty.com" },
  },
];

const J = (s) => JSON.stringify(s);
const bpmFrom = (tags = "") => { const m = String(tags).match(/(\d{2,3})\s*BPM/i); return m ? Number(m[1]) : undefined; };

async function fetchClips(id) {
  const res = await fetch(`https://studio-api.prod.suno.com/api/playlist/${id}/?page=1`, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`playlist ${id}: HTTP ${res.status}`);
  const d = await res.json();
  return (d.playlist_clips || []).map((c) => c.clip || c);
}

function emitTrack(c, i, p) {
  const bpm = bpmFrom((c.metadata || {}).tags);
  const lines = [
    "  {",
    `    id: ${J(c.id)},`,
    `    number: ${i + 1},`,
    `    title: ${J(p.cleanTitle(c.title))},`,
    `    person: ${J(p.person(c.title))},`,
  ];
  if (bpm) lines.push(`    bpm: ${bpm},`);
  lines.push(`    audioUrl: ${J(c.audio_url)},`);
  if (c.image_url) lines.push(`    coverImage: ${J(c.image_url)},`);
  lines.push(`    art: { palette: [${J(p.accent)}] },`, "  },");
  return lines.join("\n");
}

const blocks = [];
for (const p of PLAYLISTS) {
  const clips = await fetchClips(p.id);
  blocks.push({ p, body: clips.map((c, i) => emitTrack(c, i, p)).join("\n") });
  console.log(`${p.varName}: ${clips.length} tracks`);
}

const stationLine = (s, collection) =>
  `  { id: ${J(s.id)}, freq: ${J(s.freq)}, name: ${J(s.name)}, desc: ${J(s.desc)}, collection: ${collection}${s.href ? `, href: ${J(s.href)}` : ""} },`;

const out = `import type { PlayerTrack } from "@walkswithaswagger/winamp";

// Station collections for ghost.radio.fm. Gorgeous Ghost is local audio;
// the rest stream from Suno's public CDN (CORS \`*\`, so the visualizer + EQ
// work). The Suno collections + STATIONS below are GENERATED — edit the
// playlists on Suno and re-run \`node examples/playground/scripts/sync-suno.mjs\`,
// don't hand-edit.

export const gorgeousGhost: PlayerTrack[] = [
  { id: "gg-now", number: 1, title: "Gorgeous Ghost (NOW)", person: "Kris Krüg", bpm: 100, audioUrl: "/audio/gorgeous-ghost-now.mp3", coverImage: "/art/gorgeous-ghost-now.jpg", art: { palette: ["#b49cff"] } },
  { id: "dark-door", number: 2, title: "The Dark's Just a Door (Remastered)", person: "Kris Krüg", bpm: 92, audioUrl: "/audio/the-darks-just-a-door.mp3", coverImage: "/art/the-darks-just-a-door.jpg", art: { palette: ["#e6a64d"] } },
  { id: "gg", number: 3, title: "Gorgeous Ghost", person: "Kris Krüg", bpm: 100, audioUrl: "/audio/gorgeous-ghost.mp3", coverImage: "/art/gorgeous-ghost.jpg", art: { palette: ["#d2a6e8"] } },
];

${blocks.map((b) => `// ${b.p.comment}\nexport const ${b.p.varName}: PlayerTrack[] = [\n${b.body}\n];`).join("\n\n")}

export type Station = {
  id: string;
  freq: string;
  name: string;
  desc: string;
  collection: PlayerTrack[];
  href?: string;
};

// Dial presets — tuning one swaps what the floating deck plays.
export const STATIONS: Station[] = [
${blocks.map((b) => stationLine(b.p.station, b.p.varName)).join("\n")}
${stationLine({ id: "gorgeous-ghost", freq: "100.7", name: "GORGEOUS GHOST", desc: "The album — live on the deck." }, "gorgeousGhost")}
];
`;

fs.writeFileSync(OUT, out);
console.log("wrote", path.relative(process.cwd(), OUT));
