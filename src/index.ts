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
export { ClassicWinampPlayer } from "./classic/ClassicWinampPlayer";
export { SKIN_SPRITES, SPRITE_DIMS } from "./classic/skinSprites";
export type { SpriteDef, SpriteName } from "./classic/skinSprites";
