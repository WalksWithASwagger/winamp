// Ph3 demo: the classic main window with wired transport + sliders, in its own
// PlayerProvider. Audio is a generated WAV blob (self-contained, no network) so
// playback, the position slider, and volume are all verifiable here. The Suno
// collections above still await real audio.
import { useMemo } from "react";
import {
  ClassicWinampPlayer,
  PlayerProvider,
  type PlayerTrack,
} from "@walkswithaswagger/winamp";

const SKIN_URL =
  "https://raw.githubusercontent.com/captbaritone/webamp/master/packages/webamp-demo/skins/Green-Dimension-V2.wsz";

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
    ],
    [],
  );

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "0.95rem", margin: "0 0 0.5rem" }}>
        Classic skin — wired controls (Ph3)
      </h2>
      <p style={{ margin: "0 0 0.75rem", color: "#8c819b", fontSize: "0.8rem" }}>
        A real <code>.wsz</code> via <code>ClassicWinampPlayer</code>, driven by
        its own <code>PlayerProvider</code>. Transport, position, and volume are
        live (a generated demo tone).
      </p>
      <PlayerProvider tracks={tracks}>
        <ClassicWinampPlayer skinUrl={SKIN_URL} scale={2} />
      </PlayerProvider>
    </div>
  );
}
