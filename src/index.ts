export { PlayerProvider, usePlayer, EQ_BANDS, EQ_MAX_DB } from "./PlayerProvider";
export { WinampPlayer } from "./WinampPlayer";
export { usePrefersReducedMotion } from "./usePrefersReducedMotion";
export type { PlayerTrack, NowPlaying } from "./types";

// Classic `.wsz` skin engine (sprite-based UI built on the same PlayerProvider).
export { parseSkin, parseViscolor, parsePledit } from "./classic/skinParser";
export type { Skin, SkinColors } from "./classic/skinParser";
export { useSkin } from "./classic/useSkin";
export type { SkinStatus, UseSkinResult } from "./classic/useSkin";
export { SkinProvider, useSkinContext } from "./classic/SkinContext";
export { Sprite, SpriteButton } from "./classic/Sprite";
export { Slider } from "./classic/Slider";
export { ClassicWinampPlayer } from "./classic/ClassicWinampPlayer";
export { ClassicEqWindow } from "./classic/ClassicEqWindow";
export { ClassicPlaylistWindow } from "./classic/ClassicPlaylistWindow";
export { BitmapText, Marquee, TimeDisplay } from "./classic/readouts";
export { ClassicVisualizer } from "./classic/ClassicVisualizer";
export { glyphFor } from "./classic/font";
export { SKIN_SPRITES, SPRITE_DIMS } from "./classic/skinSprites";
export type { SpriteDef, SpriteName } from "./classic/skinSprites";
