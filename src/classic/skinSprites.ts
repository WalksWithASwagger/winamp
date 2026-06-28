// Classic Winamp 2 main-window sprite coordinates.
//
// Ported from Webamp (captbaritone/webamp, MIT) — see NOTICE. Coordinates are
// copied verbatim for pixel fidelity; re-deriving them by hand is error-prone.
// EQ / playlist / TEXT-font sprite sets are intentionally deferred to their
// later phases (Ph4–Ph6).

import { TEXT_SPRITES } from "./font";

export type SpriteDef = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Sprite definitions grouped by their source BMP file (sans extension). */
export const SKIN_SPRITES: Record<string, SpriteDef[]> = {
  TEXT: TEXT_SPRITES,
  MAIN: [{ name: "MAIN_WINDOW_BACKGROUND", x: 0, y: 0, width: 275, height: 116 }],
  CBUTTONS: [
    { name: "MAIN_PREVIOUS_BUTTON", x: 0, y: 0, width: 23, height: 18 },
    { name: "MAIN_PREVIOUS_BUTTON_ACTIVE", x: 0, y: 18, width: 23, height: 18 },
    { name: "MAIN_PLAY_BUTTON", x: 23, y: 0, width: 23, height: 18 },
    { name: "MAIN_PLAY_BUTTON_ACTIVE", x: 23, y: 18, width: 23, height: 18 },
    { name: "MAIN_PAUSE_BUTTON", x: 46, y: 0, width: 23, height: 18 },
    { name: "MAIN_PAUSE_BUTTON_ACTIVE", x: 46, y: 18, width: 23, height: 18 },
    { name: "MAIN_STOP_BUTTON", x: 69, y: 0, width: 23, height: 18 },
    { name: "MAIN_STOP_BUTTON_ACTIVE", x: 69, y: 18, width: 23, height: 18 },
    { name: "MAIN_NEXT_BUTTON", x: 92, y: 0, width: 23, height: 18 },
    { name: "MAIN_NEXT_BUTTON_ACTIVE", x: 92, y: 18, width: 22, height: 18 },
    { name: "MAIN_EJECT_BUTTON", x: 114, y: 0, width: 22, height: 16 },
    { name: "MAIN_EJECT_BUTTON_ACTIVE", x: 114, y: 16, width: 22, height: 16 },
  ],
  TITLEBAR: [
    { name: "MAIN_TITLE_BAR", x: 27, y: 15, width: 275, height: 14 },
    { name: "MAIN_TITLE_BAR_SELECTED", x: 27, y: 0, width: 275, height: 14 },
    { name: "MAIN_OPTIONS_BUTTON", x: 0, y: 0, width: 9, height: 9 },
    { name: "MAIN_OPTIONS_BUTTON_DEPRESSED", x: 0, y: 9, width: 9, height: 9 },
    { name: "MAIN_MINIMIZE_BUTTON", x: 9, y: 0, width: 9, height: 9 },
    { name: "MAIN_MINIMIZE_BUTTON_DEPRESSED", x: 9, y: 9, width: 9, height: 9 },
    { name: "MAIN_CLOSE_BUTTON", x: 18, y: 0, width: 9, height: 9 },
    { name: "MAIN_CLOSE_BUTTON_DEPRESSED", x: 18, y: 9, width: 9, height: 9 },
    { name: "MAIN_SHADE_BUTTON", x: 0, y: 18, width: 9, height: 9 },
    { name: "MAIN_SHADE_BUTTON_DEPRESSED", x: 9, y: 18, width: 9, height: 9 },
    { name: "MAIN_SHADE_BACKGROUND", x: 27, y: 42, width: 275, height: 14 },
    { name: "MAIN_SHADE_BACKGROUND_SELECTED", x: 27, y: 29, width: 275, height: 14 },
  ],
  MONOSTER: [
    { name: "MAIN_STEREO", x: 0, y: 12, width: 29, height: 12 },
    { name: "MAIN_STEREO_SELECTED", x: 0, y: 0, width: 29, height: 12 },
    { name: "MAIN_MONO", x: 29, y: 12, width: 27, height: 12 },
    { name: "MAIN_MONO_SELECTED", x: 29, y: 0, width: 27, height: 12 },
  ],
  PLAYPAUS: [
    { name: "MAIN_PLAYING_INDICATOR", x: 0, y: 0, width: 9, height: 9 },
    { name: "MAIN_PAUSED_INDICATOR", x: 9, y: 0, width: 9, height: 9 },
    { name: "MAIN_STOPPED_INDICATOR", x: 18, y: 0, width: 9, height: 9 },
    { name: "MAIN_WORKING_INDICATOR", x: 39, y: 0, width: 9, height: 9 },
  ],
  NUMBERS: [
    { name: "MINUS_SIGN", x: 20, y: 6, width: 5, height: 1 },
    { name: "DIGIT_0", x: 0, y: 0, width: 9, height: 13 },
    { name: "DIGIT_1", x: 9, y: 0, width: 9, height: 13 },
    { name: "DIGIT_2", x: 18, y: 0, width: 9, height: 13 },
    { name: "DIGIT_3", x: 27, y: 0, width: 9, height: 13 },
    { name: "DIGIT_4", x: 36, y: 0, width: 9, height: 13 },
    { name: "DIGIT_5", x: 45, y: 0, width: 9, height: 13 },
    { name: "DIGIT_6", x: 54, y: 0, width: 9, height: 13 },
    { name: "DIGIT_7", x: 63, y: 0, width: 9, height: 13 },
    { name: "DIGIT_8", x: 72, y: 0, width: 9, height: 13 },
    { name: "DIGIT_9", x: 81, y: 0, width: 9, height: 13 },
  ],
  POSBAR: [
    { name: "MAIN_POSITION_SLIDER_BACKGROUND", x: 0, y: 0, width: 248, height: 10 },
    { name: "MAIN_POSITION_SLIDER_THUMB", x: 248, y: 0, width: 29, height: 10 },
    { name: "MAIN_POSITION_SLIDER_THUMB_SELECTED", x: 278, y: 0, width: 29, height: 10 },
  ],
  VOLUME: [
    { name: "MAIN_VOLUME_BACKGROUND", x: 0, y: 0, width: 68, height: 420 },
    { name: "MAIN_VOLUME_THUMB", x: 15, y: 422, width: 14, height: 11 },
    { name: "MAIN_VOLUME_THUMB_SELECTED", x: 0, y: 422, width: 14, height: 11 },
  ],
  BALANCE: [
    { name: "MAIN_BALANCE_BACKGROUND", x: 9, y: 0, width: 38, height: 420 },
    { name: "MAIN_BALANCE_THUMB", x: 15, y: 422, width: 14, height: 11 },
    { name: "MAIN_BALANCE_THUMB_ACTIVE", x: 0, y: 422, width: 14, height: 11 },
  ],
  SHUFREP: [
    { name: "MAIN_SHUFFLE_BUTTON", x: 28, y: 0, width: 47, height: 15 },
    { name: "MAIN_SHUFFLE_BUTTON_SELECTED", x: 28, y: 30, width: 47, height: 15 },
    { name: "MAIN_REPEAT_BUTTON", x: 0, y: 0, width: 28, height: 15 },
    { name: "MAIN_REPEAT_BUTTON_SELECTED", x: 0, y: 30, width: 28, height: 15 },
    { name: "MAIN_EQ_BUTTON", x: 0, y: 61, width: 23, height: 12 },
    { name: "MAIN_EQ_BUTTON_SELECTED", x: 0, y: 73, width: 23, height: 12 },
    { name: "MAIN_PLAYLIST_BUTTON", x: 23, y: 61, width: 23, height: 12 },
    { name: "MAIN_PLAYLIST_BUTTON_SELECTED", x: 23, y: 73, width: 23, height: 12 },
  ],
  EQMAIN: [
    { name: "EQ_WINDOW_BACKGROUND", x: 0, y: 0, width: 275, height: 116 },
    { name: "EQ_TITLE_BAR_SELECTED", x: 0, y: 134, width: 275, height: 14 },
    { name: "EQ_TITLE_BAR", x: 0, y: 149, width: 275, height: 14 },
    { name: "EQ_CLOSE_BUTTON", x: 0, y: 116, width: 9, height: 9 },
    { name: "EQ_CLOSE_BUTTON_ACTIVE", x: 0, y: 125, width: 9, height: 9 },
    { name: "EQ_SLIDER_THUMB", x: 0, y: 164, width: 11, height: 11 },
    { name: "EQ_SLIDER_THUMB_SELECTED", x: 0, y: 176, width: 11, height: 11 },
    { name: "EQ_ON_BUTTON", x: 10, y: 119, width: 26, height: 12 },
    { name: "EQ_ON_BUTTON_SELECTED", x: 69, y: 119, width: 26, height: 12 },
    { name: "EQ_AUTO_BUTTON", x: 36, y: 119, width: 32, height: 12 },
    { name: "EQ_AUTO_BUTTON_SELECTED", x: 95, y: 119, width: 32, height: 12 },
    { name: "EQ_PRESETS_BUTTON", x: 224, y: 164, width: 44, height: 12 },
    { name: "EQ_PRESETS_BUTTON_SELECTED", x: 224, y: 176, width: 44, height: 12 },
  ],
  PLEDIT: [
    { name: "PLAYLIST_TOP_LEFT_SELECTED", x: 0, y: 0, width: 25, height: 20 },
    { name: "PLAYLIST_TITLE_BAR_SELECTED", x: 26, y: 0, width: 100, height: 20 },
    { name: "PLAYLIST_TOP_TILE_SELECTED", x: 127, y: 0, width: 25, height: 20 },
    { name: "PLAYLIST_TOP_RIGHT_CORNER_SELECTED", x: 153, y: 0, width: 25, height: 20 },
    { name: "PLAYLIST_LEFT_TILE", x: 0, y: 42, width: 12, height: 29 },
    { name: "PLAYLIST_RIGHT_TILE", x: 31, y: 42, width: 20, height: 29 },
    { name: "PLAYLIST_BOTTOM_LEFT_CORNER", x: 0, y: 72, width: 125, height: 38 },
    { name: "PLAYLIST_BOTTOM_RIGHT_CORNER", x: 126, y: 72, width: 150, height: 38 },
    // Window-shade bar (collapsed playlist): left + tiled center + right.
    { name: "PLAYLIST_SHADE_LEFT", x: 72, y: 42, width: 25, height: 14 },
    { name: "PLAYLIST_SHADE_CENTER", x: 72, y: 57, width: 25, height: 14 },
    { name: "PLAYLIST_SHADE_RIGHT", x: 99, y: 42, width: 50, height: 14 },
  ],
};

export type SpriteName = string;

/** name → { width, height }, derived once so primitives can size themselves. */
export const SPRITE_DIMS: Record<string, { width: number; height: number }> =
  Object.fromEntries(
    Object.values(SKIN_SPRITES)
      .flat()
      .map((s) => [s.name, { width: s.width, height: s.height }]),
  );
