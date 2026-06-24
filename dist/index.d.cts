import * as react from 'react';
import { ReactNode } from 'react';

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

export { EQ_BANDS, EQ_MAX_DB, type NowPlaying, PlayerProvider, type PlayerTrack, WinampPlayer, usePlayer, usePrefersReducedMotion };
