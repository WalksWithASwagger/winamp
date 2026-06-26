// Ph2 demo: the static classic main window, rendered pixel-faithfully from a
// real .wsz via the library's ClassicWinampPlayer (parser + sprites under the
// hood). Transport wiring + sliders arrive in Ph3.
import { ClassicWinampPlayer } from "@walkswithaswagger/winamp";

const SKIN_URL =
  "https://raw.githubusercontent.com/captbaritone/webamp/master/packages/webamp-demo/skins/Green-Dimension-V2.wsz";

export function ClassicSkinDemo() {
  return (
    <div style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "0.95rem", margin: "0 0 0.5rem" }}>
        Classic skin — static main window (Ph2)
      </h2>
      <p style={{ margin: "0 0 0.75rem", color: "#8c819b", fontSize: "0.8rem" }}>
        A real <code>.wsz</code> rendered pixel-faithfully via{" "}
        <code>ClassicWinampPlayer</code>. Static for now — Ph3 wires the
        transport + sliders.
      </p>
      <ClassicWinampPlayer skinUrl={SKIN_URL} scale={2} />
    </div>
  );
}
