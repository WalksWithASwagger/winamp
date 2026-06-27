// Ph3 demo: the classic main window with wired transport + sliders, in its own
// PlayerProvider. Audio is a generated WAV blob (self-contained, no network) so
// playback, the position slider, and volume are all verifiable here. The Suno
// collections above still await real audio.
import { useEffect, useMemo, useState } from "react";
import {
  ClassicEqWindow,
  ClassicPlaylistWindow,
  ClassicWinampPlayer,
  PlayerProvider,
  skinMuseumUrl,
  usePlayer,
  type PlayerTrack,
} from "@walkswithaswagger/winamp";

// Cue (load without playing) the demo track on mount so the marquee shows a
// real title and the time display reads the track — no autoplay gesture needed.
function CueOnMount({ id }: { id: string }) {
  const { cue } = usePlayer();
  useEffect(() => cue(id), [cue, id]);
  return null;
}

const demoSkin = (name: string) =>
  `https://raw.githubusercontent.com/captbaritone/webamp/master/packages/webamp-demo/skins/${name}.wsz`;

// Runtime-switchable skins: webamp demo skins + one from the Skin Museum by MD5.
const SKINS: Array<{ label: string; url: string }> = [
  { label: "Green Dimension", url: demoSkin("Green-Dimension-V2") },
  { label: "MacOS X Aqua", url: demoSkin("MacOSXAqua1-5") },
  { label: "TopazAmp", url: demoSkin("TopazAmp1-2") },
  { label: "Vizor", url: demoSkin("Vizor1-01") },
  { label: "Classic (Museum)", url: skinMuseumUrl("5e4f10275dcb1fb211d4a8b4f1bda236") },
];

// A few seconds of a quiet tone as a WAV object URL — gives the deck something
// real to play without bundling or fetching an audio file.
function toneWavUrl(seconds = 20, freq = 220, sampleRate = 8000): string {
  const samples = seconds * sampleRate;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const s = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.04;
    view.setInt16(44 + i * 2, s * 0x7fff, true);
  }
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

export function ClassicSkinDemo() {
  const tracks = useMemo<PlayerTrack[]>(
    () => [
      {
        id: "demo",
        number: 1,
        title: "Demo Tone",
        person: "playground",
        bpm: 120,
        audioUrl: toneWavUrl(),
        art: { palette: ["#39c216"] },
      },
      { id: "p2", number: 2, title: "Coming Soon", person: "Suno", bpm: 0, art: { palette: ["#39c216"] } },
      { id: "p3", number: 3, title: "Add Your Audio", person: "Suno", bpm: 0, art: { palette: ["#39c216"] } },
    ],
    [],
  );

  const [skinUrl, setSkinUrl] = useState(SKINS[0].url);

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "0.95rem", margin: "0 0 0.5rem" }}>
        Classic skin — main + EQ + playlist (Ph8 · epic complete)
      </h2>
      <p style={{ margin: "0 0 0.75rem", color: "#8c819b", fontSize: "0.8rem" }}>
        Real <code>.wsz</code> via the classic windows on one shared{" "}
        <code>PlayerProvider</code>: transport, EQ, playlist (click a row),
        shade/2× (title bar), balance + shuffle/repeat, and live skin switching.
      </p>
      <label style={{ display: "block", marginBottom: 12, fontSize: "0.8rem" }}>
        Skin:{" "}
        <select
          value={skinUrl}
          onChange={(e) => setSkinUrl(e.target.value)}
          style={{ background: "#2a2438", color: "#c8bdd7", border: "1px solid #3a3450", borderRadius: 4, padding: "2px 6px" }}
        >
          {SKINS.map((s) => (
            <option key={s.url} value={s.url}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <PlayerProvider tracks={tracks}>
        <CueOnMount id="demo" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ClassicWinampPlayer skinUrl={skinUrl} scale={2} />
          <ClassicEqWindow skinUrl={skinUrl} scale={2} />
          <ClassicPlaylistWindow skinUrl={skinUrl} scale={2} />
        </div>
      </PlayerProvider>
    </div>
  );
}
