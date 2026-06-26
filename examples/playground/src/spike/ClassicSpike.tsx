// Ph0 spike (throwaway): three real Winamp sprite buttons, sliced live from a
// .wsz, driving the existing PlayerProvider engine via usePlayer().
import { useEffect, useState } from "react";
import { usePlayer } from "@walkswithaswagger/winamp";
import { sliceSkin, type SpriteSet } from "./sliceSkin";

// Fetched at runtime from webamp's demo skins (raw.githubusercontent serves
// CORS-enabled), so nothing is bundled and no skin is committed to this repo.
const SKIN_URL =
  "https://raw.githubusercontent.com/captbaritone/webamp/master/packages/webamp-demo/skins/Green-Dimension-V2.wsz";

function SpriteButton({
  up,
  down,
  width,
  onClick,
  title,
}: {
  up: string;
  down: string;
  width: number;
  onClick: () => void;
  title: string;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: width * 2,
        height: 18 * 2,
        padding: 0,
        border: "none",
        cursor: "pointer",
        backgroundColor: "transparent",
        backgroundImage: `url(${pressed ? down : up})`,
        backgroundSize: "cover",
        imageRendering: "pixelated",
      }}
    />
  );
}

export function ClassicSpike() {
  const { toggle, next, prev } = usePlayer();
  const [sprites, setSprites] = useState<SpriteSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(SKIN_URL)
      .then((r) => r.arrayBuffer())
      .then(sliceSkin)
      .then((s) => alive && setSprites(s))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "0.95rem", margin: "0 0 0.5rem" }}>
        Classic skin spike (Ph0)
      </h2>
      <p style={{ margin: "0 0 0.75rem", color: "#8c819b", fontSize: "0.8rem" }}>
        Transport buttons sliced live from a real <code>.wsz</code> file, wired
        to the same audio engine. Proves unzip → BMP decode → sprite → control.
      </p>
      {error && <div style={{ color: "#ff6b6b" }}>skin load failed: {error}</div>}
      {!error && !sprites && <div style={{ color: "#8c819b" }}>loading skin…</div>}
      {sprites && (
        <div
          style={{
            display: "inline-flex",
            gap: 0,
            padding: 8,
            background: "#000",
            borderRadius: 4,
          }}
        >
          <SpriteButton up={sprites.prevUp} down={sprites.prevDown} width={23} onClick={prev} title="Previous" />
          <SpriteButton up={sprites.playUp} down={sprites.playDown} width={23} onClick={toggle} title="Play/Pause" />
          <SpriteButton up={sprites.nextUp} down={sprites.nextDown} width={22} onClick={next} title="Next" />
        </div>
      )}
    </div>
  );
}
