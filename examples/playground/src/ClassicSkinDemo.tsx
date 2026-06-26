// Ph1 demo: the real classic-skin engine via the library's public API.
// useSkin parses a .wsz; Sprite/SpriteButton render from SkinContext; the
// buttons drive the same PlayerProvider engine. (Pixel-perfect main-window
// layout is Ph2 — here the parts are just laid out to prove the pipeline.)
import {
  SkinProvider,
  Sprite,
  SpriteButton,
  useSkin,
  usePlayer,
} from "@walkswithaswagger/winamp";

const SKIN_URL =
  "https://raw.githubusercontent.com/captbaritone/webamp/master/packages/webamp-demo/skins/Green-Dimension-V2.wsz";

function Transport() {
  const { toggle, next, prev } = usePlayer();
  return (
    <div style={{ display: "flex", marginTop: 6 }}>
      <SpriteButton up="MAIN_PREVIOUS_BUTTON" down="MAIN_PREVIOUS_BUTTON_ACTIVE" onClick={prev} title="Previous" />
      <SpriteButton up="MAIN_PLAY_BUTTON" down="MAIN_PLAY_BUTTON_ACTIVE" onClick={toggle} title="Play" />
      <SpriteButton up="MAIN_PAUSE_BUTTON" down="MAIN_PAUSE_BUTTON_ACTIVE" onClick={toggle} title="Pause" />
      <SpriteButton up="MAIN_STOP_BUTTON" down="MAIN_STOP_BUTTON_ACTIVE" onClick={() => {}} title="Stop" />
      <SpriteButton up="MAIN_NEXT_BUTTON" down="MAIN_NEXT_BUTTON_ACTIVE" onClick={next} title="Next" />
    </div>
  );
}

export function ClassicSkinDemo() {
  const { skin, status } = useSkin(SKIN_URL);

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "0.95rem", margin: "0 0 0.5rem" }}>
        Classic skin engine (Ph1)
      </h2>
      <p style={{ margin: "0 0 0.75rem", color: "#8c819b", fontSize: "0.8rem" }}>
        A real <code>.wsz</code> parsed by the library's <code>useSkin</code>,
        rendered with <code>Sprite</code> / <code>SpriteButton</code> from
        <code> SkinContext</code>; transport drives the same audio engine.
      </p>
      {status === "loading" && <div style={{ color: "#8c819b" }}>loading skin…</div>}
      {status === "error" && <div style={{ color: "#ff6b6b" }}>skin failed to load</div>}
      <SkinProvider skin={skin}>
        {/* 2× for visibility; sprites stay crisp via image-rendering: pixelated */}
        <div style={{ transform: "scale(2)", transformOrigin: "top left", width: 275 }}>
          <div style={{ display: "inline-block", background: "#000" }}>
            <Sprite name="MAIN_WINDOW_BACKGROUND" />
            <Transport />
          </div>
        </div>
      </SkinProvider>
    </div>
  );
}
