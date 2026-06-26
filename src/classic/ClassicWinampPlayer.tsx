"use client";

import type { CSSProperties } from "react";
import { usePlayer } from "../PlayerProvider";
import { useSkin } from "./useSkin";
import { SkinProvider } from "./SkinContext";
import { Sprite, SpriteButton } from "./Sprite";
import { Slider } from "./Slider";
import { Marquee, TimeDisplay } from "./readouts";
import { ClassicVisualizer } from "./ClassicVisualizer";
import type { SpriteName } from "./skinSprites";

const MAIN_WIDTH = 275;
const MAIN_HEIGHT = 116;

// Non-interactive chrome, as [sprite, left, top]. Classic Winamp geometry
// ported from webamp (MIT) css/main-window.css. EQ/playlist/shuffle/repeat
// stay static here — they open other windows (Ph5/Ph6) or need engine state
// (Ph8); the transport + sliders below are the Ph3 wiring.
const STATIC: Array<[SpriteName, number, number]> = [
  ["MAIN_TITLE_BAR_SELECTED", 0, 0],
  ["MAIN_OPTIONS_BUTTON", 6, 3],
  ["MAIN_MINIMIZE_BUTTON", 244, 3],
  ["MAIN_CLOSE_BUTTON", 264, 3],
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

/**
 * Classic Winamp main window rendered from a `.wsz` skin and driven by the
 * surrounding {@link PlayerProvider}. Transport buttons show their pressed
 * sprite and control playback; the position and volume sliders track and set
 * the engine. The time display, song-title marquee, and spectrum visualizer
 * read live engine state. Must be rendered inside a `<PlayerProvider>`.
 */
export function ClassicWinampPlayer({
  skinUrl,
  scale = 1,
}: {
  skinUrl: string;
  scale?: number;
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

  return (
    <SkinProvider skin={skin}>
      <div
        data-skin-status={status}
        style={{ width: MAIN_WIDTH * scale, height: MAIN_HEIGHT * scale }}
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
        </div>
      </div>
    </SkinProvider>
  );
}
