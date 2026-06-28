// Classic windows demo: main + EQ + playlist on one shared PlayerProvider,
// playing KK's real local tracks (see tracks.ts; the MP3s are gitignored).
import { useEffect, useState } from "react";
import {
  ClassicEqWindow,
  ClassicPlaylistWindow,
  ClassicWinampPlayer,
  PlayerProvider,
  skinMuseumUrl,
  usePlayer,
} from "@walkswithaswagger/winamp";
import { gorgeousGhost } from "./tracks";

// Cue (load without playing) a track on mount so the marquee shows a real
// title and the time display reads the track — no autoplay gesture needed.
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

export function ClassicSkinDemo() {
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
      <PlayerProvider tracks={gorgeousGhost}>
        <CueOnMount id={gorgeousGhost[0].id} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ClassicWinampPlayer skinUrl={skinUrl} scale={2} />
          <ClassicEqWindow skinUrl={skinUrl} scale={2} />
          <ClassicPlaylistWindow skinUrl={skinUrl} scale={2} />
        </div>
      </PlayerProvider>
    </div>
  );
}
