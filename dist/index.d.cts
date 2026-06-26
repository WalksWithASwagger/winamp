import * as react from 'react';
import { ReactNode, CSSProperties } from 'react';

interface PlayerTrack {
    id: string;
    number: number;
    title: string;
    person: string;
    bpm: number;
    audioUrl?: string;
    coverImage?: string;
    art: {
        palette: string[];
    };
}
/** Fired when a track starts, so a host app can react (e.g. drive an ambient
 *  scene) without the player importing anything app-specific. */
type NowPlaying = {
    bpm: number;
    accent: string;
};

declare const EQ_BANDS: number[];
declare const EQ_MAX_DB = 12;
type PlayerValue = {
    allTracks: PlayerTrack[];
    currentId: string | null;
    playing: boolean;
    time: number;
    duration: number;
    volume: number;
    analyser: AnalyserNode | null;
    bpm: number | null;
    eqGains: number[];
    setEqGain: (band: number, db: number) => void;
    setEqGains: (gains: number[]) => void;
    cue: (id: string) => void;
    playTrack: (id: string) => void;
    toggle: () => void;
    next: () => void;
    prev: () => void;
    seek: (t: number) => void;
    setVolume: (v: number) => void;
};
declare function usePlayer(): PlayerValue;
declare function PlayerProvider({ tracks, onNowPlaying, children, }: {
    tracks: PlayerTrack[];
    /** Optional hook so a host app can react to the playing track (e.g. drive an
     *  ambient scene) without the player depending on anything app-specific. */
    onNowPlaying?: (info: NowPlaying) => void;
    children: ReactNode;
}): react.JSX.Element;

declare function WinampPlayer({ storageKey, wordmarkSrc, wordmarkText, spectrumColors, }?: {
    storageKey?: string;
    wordmarkSrc?: string;
    wordmarkText?: string;
    spectrumColors?: string[];
}): react.JSX.Element;

declare function usePrefersReducedMotion(): boolean;

type SpriteDef = {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
};
/** Sprite definitions grouped by their source BMP file (sans extension). */
declare const SKIN_SPRITES: Record<string, SpriteDef[]>;
type SpriteName = string;
/** name → { width, height }, derived once so primitives can size themselves. */
declare const SPRITE_DIMS: Record<string, {
    width: number;
    height: number;
}>;

type SkinColors = {
    /** 24 visualizer colors as CSS `rgb(...)` strings (from viscolor.txt). */
    viscolor: string[];
    /** Playlist editor colors (from pledit.txt). */
    playlistNormal?: string;
    playlistCurrent?: string;
    playlistNormalBackground?: string;
    playlistSelectedBackground?: string;
};
type Skin = {
    /** Sprite name → data-URI of the cropped image. */
    sprites: Partial<Record<SpriteName, string>>;
    colors: SkinColors;
};
/** Parse viscolor.txt — 24 lines of `r,g,b` (trailing `// comment` allowed). */
declare function parseViscolor(text: string): string[];
/** Parse the `[Text]` color keys out of pledit.txt. */
declare function parsePledit(text: string): Partial<SkinColors>;
/**
 * Parse a `.wsz` ArrayBuffer into a {@link Skin}: unzip, decode each BMP the
 * browser supports natively, crop every known sprite to a data-URI, and read
 * the color config. `fflate` is dynamic-imported so consumers of the modern
 * deck never pull it into their bundle.
 */
declare function parseSkin(buf: ArrayBuffer): Promise<Skin>;

type SkinStatus = "loading" | "ready" | "error";
type UseSkinResult = {
    skin: Skin | null;
    status: SkinStatus;
    error: Error | null;
};
/**
 * Load and parse a `.wsz` skin by URL. Never throws into the render tree —
 * parse/fetch failures surface as `status: "error"` so the caller can fall back
 * to a base skin. Re-runs when `url` changes (runtime skin switching).
 */
declare function useSkin(url: string | null | undefined): UseSkinResult;

declare function SkinProvider({ skin, children, }: {
    skin: Skin | null;
    children: ReactNode;
}): react.JSX.Element;
/** The active parsed skin, or null while loading / on error. */
declare function useSkinContext(): Skin | null;

/** A single skin sprite rendered at its native pixel size. */
declare function Sprite({ name, style, }: {
    name: SpriteName;
    style?: CSSProperties;
}): react.JSX.Element;
/**
 * A button that shows its `up` sprite normally and `down` while pressed.
 * Sized from the `up` sprite.
 */
declare function SpriteButton({ up, down, onClick, title, style, }: {
    up: SpriteName;
    down: SpriteName;
    onClick?: () => void;
    title?: string;
    style?: CSSProperties;
}): react.JSX.Element;

/**
 * A skin slider: a track sprite with a draggable thumb. `value` is 0..1 and
 * `onChange` fires with the new fraction during drag.
 *
 * Some Winamp track sprites (e.g. VOLUME) are a vertical strip of `frames`
 * level-variants; pass `frames`/`frameHeight` to window into the right one for
 * the current value. Single-frame tracks (e.g. POSBAR) omit them.
 */
declare function Slider({ background, thumb, thumbActive, value, onChange, trackWidth, trackHeight, frames, frameHeight, style, }: {
    background: SpriteName;
    thumb: SpriteName;
    thumbActive?: SpriteName;
    value: number;
    onChange?: (value: number) => void;
    trackWidth: number;
    trackHeight: number;
    frames?: number;
    frameHeight?: number;
    style?: CSSProperties;
}): react.JSX.Element;

/**
 * Classic Winamp main window rendered from a `.wsz` skin and driven by the
 * surrounding {@link PlayerProvider}. Transport buttons show their pressed
 * sprite and control playback; the position and volume sliders track and set
 * the engine. The time display, song-title marquee, and spectrum visualizer
 * read live engine state. Must be rendered inside a `<PlayerProvider>`.
 */
declare function ClassicWinampPlayer({ skinUrl, scale, }: {
    skinUrl: string;
    scale?: number;
}): react.JSX.Element;

/** Elapsed time as four NUMBERS sprite digits (m m : s s). */
declare function TimeDisplay({ seconds }: {
    seconds: number;
}): react.JSX.Element;
/** A string drawn in the skin's 5×6 bitmap font. */
declare function BitmapText({ text }: {
    text: string;
}): react.JSX.Element;
/**
 * Scrolling song-title marquee in the skin's bitmap font. Scrolls only when the
 * text overflows the track, and not at all under prefers-reduced-motion.
 */
declare function Marquee({ text, width, left, top, }: {
    text: string;
    width?: number;
    left?: number;
    top?: number;
}): react.JSX.Element;

/**
 * The classic spectrum analyzer, drawn from the player's AnalyserNode and
 * colored with the skin's viscolor palette (index 0 = background, 2..17 = the
 * bottom-to-top spectrum gradient). Idle when there's no analyser yet.
 */
declare function ClassicVisualizer({ analyser, left, top, }: {
    analyser: AnalyserNode | null;
    left?: number;
    top?: number;
}): react.JSX.Element;

/** Resolve any character to its glyph sprite name (uppercase-folded). */
declare const glyphFor: (ch: string) => string | undefined;

export { BitmapText, ClassicVisualizer, ClassicWinampPlayer, EQ_BANDS, EQ_MAX_DB, Marquee, type NowPlaying, PlayerProvider, type PlayerTrack, SKIN_SPRITES, SPRITE_DIMS, type Skin, type SkinColors, SkinProvider, type SkinStatus, Slider, Sprite, SpriteButton, type SpriteDef, type SpriteName, TimeDisplay, type UseSkinResult, WinampPlayer, glyphFor, parsePledit, parseSkin, parseViscolor, usePlayer, usePrefersReducedMotion, useSkin, useSkinContext };
