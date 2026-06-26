"use client";

import type { CSSProperties } from "react";
import { useSkin } from "./useSkin";
import { SkinProvider } from "./SkinContext";
import { Sprite } from "./Sprite";
import type { SpriteName } from "./skinSprites";

const MAIN_WIDTH = 275;
const MAIN_HEIGHT = 116;

// Static element positions on the 275×116 main window, as [left, top].
// Classic Winamp geometry, ported from webamp (MIT) css/main-window.css.
// Sliders (volume/balance/position thumbs) and dynamic readouts (time,
// marquee, visualizer) are added in Ph3/Ph4 — the background art shows their
// grooves so the window already reads complete.
const PLACED: Array<[SpriteName, number, number]> = [
  ["MAIN_TITLE_BAR_SELECTED", 0, 0],
  ["MAIN_OPTIONS_BUTTON", 6, 3],
  ["MAIN_MINIMIZE_BUTTON", 244, 3],
  ["MAIN_CLOSE_BUTTON", 264, 3],
  ["MAIN_STOPPED_INDICATOR", 26, 28],
  ["MAIN_MONO", 212, 41],
  ["MAIN_STEREO", 239, 41],
  ["MAIN_PREVIOUS_BUTTON", 16, 88],
  ["MAIN_PLAY_BUTTON", 39, 88],
  ["MAIN_PAUSE_BUTTON", 62, 88],
  ["MAIN_STOP_BUTTON", 85, 88],
  ["MAIN_NEXT_BUTTON", 108, 88],
  ["MAIN_EJECT_BUTTON", 136, 89],
  ["MAIN_SHUFFLE_BUTTON", 164, 89],
  ["MAIN_REPEAT_BUTTON", 210, 89],
  ["MAIN_EQ_BUTTON", 219, 58],
  ["MAIN_PLAYLIST_BUTTON", 242, 58],
];

const placed = (left: number, top: number): CSSProperties => ({
  position: "absolute",
  left,
  top,
});

/**
 * Static classic main window rendered from a `.wsz` skin — pixel-faithful
 * chrome with every sprite in place. Presentational only (Ph2); transport
 * wiring + sliders land in Ph3, dynamic readouts in Ph4.
 *
 * `scale` renders the 275×116 window larger while keeping sprites crisp.
 */
export function ClassicWinampPlayer({
  skinUrl,
  scale = 1,
}: {
  skinUrl: string;
  scale?: number;
}) {
  const { skin, status } = useSkin(skinUrl);

  return (
    <SkinProvider skin={skin}>
      <div
        data-skin-status={status}
        style={{
          width: MAIN_WIDTH * scale,
          height: MAIN_HEIGHT * scale,
        }}
      >
        <div
          style={{
            position: "relative",
            width: MAIN_WIDTH,
            height: MAIN_HEIGHT,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: "top left",
            imageRendering: "pixelated",
          }}
        >
          <Sprite name="MAIN_WINDOW_BACKGROUND" style={placed(0, 0)} />
          {PLACED.map(([name, left, top]) => (
            <Sprite key={name} name={name} style={placed(left, top)} />
          ))}
        </div>
      </div>
    </SkinProvider>
  );
}
