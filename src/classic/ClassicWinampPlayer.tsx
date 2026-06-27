"use client";

import type { CSSProperties } from "react";
import { usePlayer } from "../PlayerProvider";
import { useSkin } from "./useSkin";
import { SkinProvider } from "./SkinContext";
import { Sprite, SpriteButton } from "./Sprite";
import { Slider } from "./Slider";
import { BitmapText, Marquee, TimeDisplay } from "./readouts";
import { ClassicVisualizer } from "./ClassicVisualizer";
import { usePersistedState } from "./usePersistedState";
import type { SpriteName } from "./skinSprites";

const MAIN_WIDTH = 275;
const MAIN_HEIGHT = 116;
const SHADE_HEIGHT = 14;

// Non-interactive chrome, as [sprite, left, top]. Classic Winamp geometry
// ported from webamp (MIT) css/main-window.css.
const STATIC: Array<[SpriteName, number, number]> = [
  ["MAIN_TITLE_BAR_SELECTED", 0, 0],
  ["MAIN_OPTIONS_BUTTON", 6, 3],
  ["MAIN_MINIMIZE_BUTTON", 244, 3],
  ["MAIN_MONO", 212, 41],
  ["MAIN_STEREO", 239, 41],
  ["MAIN_EQ_BUTTON", 219, 58],
  ["MAIN_PLAYLIST_BUTTON", 242, 58],
  ["MAIN_SHUFFLE_BUTTON", 164, 89],
  ["MAIN_REPEAT_BUTTON", 210, 89],
  ["MAIN_EJECT_BUTTON", 136, 89],
];

const placed = (left: number, top: number): CSSProperties => ({
  position: "absolute",
  left,
  top,
});

const fmtTime = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/**
 * Classic Winamp main window rendered from a `.wsz` skin and driven by the
 * surrounding {@link PlayerProvider}. Transport, sliders, time, marquee, and
 * spectrum read/drive live engine state. Supports window-shade (collapsed) and
 * double-size modes, persisted to localStorage under `storageKey`.
 * Must be rendered inside a `<PlayerProvider>`.
 */
export function ClassicWinampPlayer({
  skinUrl,
  scale = 1,
  storageKey = "classicWinamp",
}: {
  skinUrl: string;
  scale?: number;
  storageKey?: string;
}) {
  const { skin, status } = useSkin(skinUrl);
  const {
    playing,
    time,
    duration,
    volume,
    analyser,
    allTracks,
    currentId,
    toggle,
    prev,
    next,
    seek,
    setVolume,
  } = usePlayer();

  const [shade, setShade] = usePersistedState(`${storageKey}:shade`, false);
  const [doubleSize, setDoubleSize] = usePersistedState(
    `${storageKey}:doubleSize`,
    false,
  );

  const current = currentId ? allTracks.find((t) => t.id === currentId) : null;
  const title = current
    ? `${current.number}. ${current.title} - ${current.person}`
    : "WINAMP";

  const play = () => {
    if (!playing) toggle();
  };
  const pause = () => {
    if (playing) toggle();
  };
  const stop = () => {
    if (playing) toggle();
    seek(0);
  };

  const position = duration > 0 ? time / duration : 0;
  const s = scale * (doubleSize ? 2 : 1);
  const height = shade ? SHADE_HEIGHT : MAIN_HEIGHT;

  // Title-bar controls common to both modes; double-click toggles double-size.
  const shadeButton = (
    <SpriteButton
      up="MAIN_SHADE_BUTTON"
      down="MAIN_SHADE_BUTTON_DEPRESSED"
      onClick={() => setShade(!shade)}
      title={shade ? "Restore" : "Windowshade"}
      style={placed(254, 3)}
    />
  );
  const closeBtn = <Sprite name="MAIN_CLOSE_BUTTON" style={placed(264, 3)} />;
  const dblToggle = (
    <div
      onDoubleClick={() => setDoubleSize(!doubleSize)}
      title="Double-click to toggle double size"
      style={{ position: "absolute", left: 30, top: 0, width: 210, height: 14, cursor: "pointer" }}
    />
  );

  return (
    <SkinProvider skin={skin}>
      <div
        data-skin-status={status}
        data-shade={shade ? "true" : "false"}
        style={{ width: MAIN_WIDTH * s, height: height * s }}
      >
        <div
          style={{
            position: "relative",
            width: MAIN_WIDTH,
            height,
            transform: s === 1 ? undefined : `scale(${s})`,
            transformOrigin: "top left",
            imageRendering: "pixelated",
          }}
        >
          {shade ? (
            <>
              <Sprite name="MAIN_SHADE_BACKGROUND_SELECTED" style={placed(0, 0)} />
              <Sprite name="MAIN_OPTIONS_BUTTON" style={placed(6, 3)} />
              <div style={{ position: "absolute", left: 130, top: 4 }}>
                <BitmapText text={fmtTime(time)} />
              </div>
              {dblToggle}
              {shadeButton}
              {closeBtn}
            </>
          ) : (
            <>
              <Sprite name="MAIN_WINDOW_BACKGROUND" style={placed(0, 0)} />
              {STATIC.map(([name, left, top]) => (
                <Sprite key={name} name={name} style={placed(left, top)} />
              ))}
              <Sprite
                name={playing ? "MAIN_PLAYING_INDICATOR" : "MAIN_STOPPED_INDICATOR"}
                style={placed(26, 28)}
              />

              <ClassicVisualizer analyser={analyser} />
              <TimeDisplay seconds={time} />
              <Marquee text={title} />
              {dblToggle}
              {shadeButton}
              {closeBtn}

              <Slider
                background="MAIN_POSITION_SLIDER_BACKGROUND"
                thumb="MAIN_POSITION_SLIDER_THUMB"
                thumbActive="MAIN_POSITION_SLIDER_THUMB_SELECTED"
                value={position}
                onChange={(v) => duration > 0 && seek(v * duration)}
                trackWidth={248}
                trackHeight={10}
                style={placed(16, 72)}
              />
              <Slider
                background="MAIN_VOLUME_BACKGROUND"
                thumb="MAIN_VOLUME_THUMB"
                thumbActive="MAIN_VOLUME_THUMB_SELECTED"
                value={volume}
                onChange={setVolume}
                trackWidth={68}
                trackHeight={13}
                frames={28}
                frameHeight={15}
                style={placed(107, 57)}
              />

              <SpriteButton up="MAIN_PREVIOUS_BUTTON" down="MAIN_PREVIOUS_BUTTON_ACTIVE" onClick={prev} title="Previous" style={placed(16, 88)} />
              <SpriteButton up="MAIN_PLAY_BUTTON" down="MAIN_PLAY_BUTTON_ACTIVE" onClick={play} title="Play" style={placed(39, 88)} />
              <SpriteButton up="MAIN_PAUSE_BUTTON" down="MAIN_PAUSE_BUTTON_ACTIVE" onClick={pause} title="Pause" style={placed(62, 88)} />
              <SpriteButton up="MAIN_STOP_BUTTON" down="MAIN_STOP_BUTTON_ACTIVE" onClick={stop} title="Stop" style={placed(85, 88)} />
              <SpriteButton up="MAIN_NEXT_BUTTON" down="MAIN_NEXT_BUTTON_ACTIVE" onClick={next} title="Next" style={placed(108, 88)} />
            </>
          )}
        </div>
      </div>
    </SkinProvider>
  );
}
