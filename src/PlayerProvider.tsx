"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NowPlaying, PlayerTrack } from "./types";

// Classic 10-band graphic-EQ centre frequencies (Winamp/ISO octave spacing).
export const EQ_BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
export const EQ_MAX_DB = 12;

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
  eqEnabled: boolean;
  preamp: number;
  setEqGain: (band: number, db: number) => void;
  setEqGains: (gains: number[]) => void;
  setEqEnabled: (on: boolean) => void;
  setPreamp: (db: number) => void;
  cue: (id: string) => void;
  playTrack: (id: string) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
};

const PlayerContext = createContext<PlayerValue | null>(null);

export function usePlayer(): PlayerValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>");
  return ctx;
}

export function PlayerProvider({
  tracks,
  onNowPlaying,
  children,
}: {
  tracks: PlayerTrack[];
  /** Optional hook so a host app can react to the playing track (e.g. drive an
   *  ambient scene) without the player depending on anything app-specific. */
  onNowPlaying?: (info: NowPlaying) => void;
  children: ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const eqRef = useRef<BiquadFilterNode[]>([]);
  const preampRef = useRef<GainNode | null>(null);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [eqGains, setEqGainsState] = useState<number[]>(() => EQ_BANDS.map(() => 0));
  const [eqEnabled, setEqEnabledState] = useState(true);
  const [preamp, setPreampState] = useState(0);
  // Mirrors of EQ state, updated only inside the setters (never during render)
  // so the lazily-built graph picks up values set before any audio existed.
  const eqGainsRef = useRef<number[]>(EQ_BANDS.map(() => 0));
  const eqEnabledRef = useRef(true);
  const preampRefDb = useRef(0);

  // Linear gain a peaking filter (or preamp) should apply for a dB value.
  const dbToGain = (db: number) => 10 ** (db / 20);

  // Only tracks with a real audio file can be played; the rest still appear in
  // the playlist (dimmed) so the deck shows the whole album.
  const playable = useMemo(() => tracks.filter((t) => t.audioUrl), [tracks]);
  const current = currentId ? tracks.find((t) => t.id === currentId) ?? null : null;

  // Lazily build the Web Audio graph on the first user-initiated play
  // (browsers block AudioContext until a gesture). createMediaElementSource may
  // only run once per element, so guard with the ref.
  const ensureGraph = useCallback(() => {
    const el = audioRef.current;
    if (!el || ctxRef.current) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const src = ac.createMediaElementSource(el);
    const an = ac.createAnalyser();
    an.fftSize = 128;
    an.smoothingTimeConstant = 0.82;

    // src → preamp → eq0 → … → eq9 → analyser → destination.
    // Preamp + peaking filters default to passthrough and pick up any value the
    // user set before the graph existed. EQ filter gains are 0 dB when disabled.
    const preampNode = ac.createGain();
    preampNode.gain.value = dbToGain(preampRefDb.current);
    const filters = EQ_BANDS.map((freq, i) => {
      const f = ac.createBiquadFilter();
      f.type = "peaking";
      f.frequency.value = freq;
      f.Q.value = 1;
      f.gain.value = eqEnabledRef.current ? eqGainsRef.current[i] ?? 0 : 0;
      return f;
    });
    src.connect(preampNode);
    const tail = filters.reduce<AudioNode>((prev, f) => {
      prev.connect(f);
      return f;
    }, preampNode);
    tail.connect(an);
    an.connect(ac.destination);

    ctxRef.current = ac;
    srcRef.current = src;
    analyserRef.current = an;
    eqRef.current = filters;
    preampRef.current = preampNode;
    setAnalyser(an);
  }, []);

  const setEqGain = useCallback((band: number, db: number) => {
    const clamped = Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, db));
    if (eqGainsRef.current[band] === clamped) return;
    const next = eqGainsRef.current.slice();
    next[band] = clamped;
    eqGainsRef.current = next;
    setEqGainsState(next);
    const f = eqRef.current[band];
    if (f && eqEnabledRef.current) f.gain.value = clamped;
  }, []);

  const setEqGains = useCallback((gains: number[]) => {
    const norm = EQ_BANDS.map((_, i) =>
      Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, gains[i] ?? 0)),
    );
    eqGainsRef.current = norm;
    setEqGainsState(norm);
    if (!eqEnabledRef.current) return;
    norm.forEach((g, i) => {
      const f = eqRef.current[i];
      if (f) f.gain.value = g;
    });
  }, []);

  const setEqEnabled = useCallback((on: boolean) => {
    eqEnabledRef.current = on;
    setEqEnabledState(on);
    // Bypass = flat filters; the stored gains are restored when re-enabled.
    eqRef.current.forEach((f, i) => {
      f.gain.value = on ? eqGainsRef.current[i] ?? 0 : 0;
    });
  }, []);

  const setPreamp = useCallback((db: number) => {
    const clamped = Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, db));
    preampRefDb.current = clamped;
    setPreampState(clamped);
    if (preampRef.current) preampRef.current.gain.value = dbToGain(clamped);
  }, []);

  const driveScene = useCallback(
    (t: PlayerTrack) => {
      onNowPlaying?.({ bpm: t.bpm, accent: t.art.palette[0] });
    },
    [onNowPlaying],
  );

  // Prime a track (load + select) WITHOUT playing — browsers block autoplay on
  // load, so a deep link can only ready the deck on that song, not start it.
  const cue = useCallback(
    (id: string) => {
      const el = audioRef.current;
      const t = tracks.find((x) => x.id === id);
      if (!el || !t?.audioUrl || currentId === id) return;
      el.src = t.audioUrl;
      setCurrentId(id);
      setTime(0);
      driveScene(t);
    },
    [tracks, currentId, driveScene],
  );

  const playTrack = useCallback(
    (id: string) => {
      const el = audioRef.current;
      const t = tracks.find((x) => x.id === id);
      if (!el || !t?.audioUrl) return;
      ensureGraph();
      void ctxRef.current?.resume();
      if (currentId !== id) {
        el.src = t.audioUrl;
        setCurrentId(id);
        setTime(0);
      }
      driveScene(t);
      void el.play();
    },
    [tracks, currentId, ensureGraph, driveScene],
  );

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!currentId) {
      if (playable[0]) playTrack(playable[0].id);
      return;
    }
    if (el.paused) {
      void ctxRef.current?.resume();
      void el.play();
    } else {
      el.pause();
    }
  }, [currentId, playable, playTrack]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (playable.length === 0) return;
      const i = playable.findIndex((t) => t.id === currentId);
      const nextIndex =
        i === -1
          ? dir === 1
            ? 0
            : playable.length - 1
          : (i + dir + playable.length) % playable.length;
      playTrack(playable[nextIndex].id);
    },
    [playable, currentId, playTrack],
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  const seek = useCallback((t: number) => {
    const el = audioRef.current;
    if (el && Number.isFinite(t)) el.currentTime = t;
  }, []);

  const setVolume = useCallback((v: number) => {
    const el = audioRef.current;
    const clamped = Math.min(1, Math.max(0, v));
    if (el) el.volume = clamped;
    setVolumeState(clamped);
  }, []);

  // Wire the single <audio> element to React state.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    const onTime = () => setTime(el.currentTime);
    const onDur = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => step(1);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("durationchange", onDur);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", onDur);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
    // `step` is stable enough; re-running on its identity is fine and cheap.
  }, [step, volume]);

  const value = useMemo<PlayerValue>(
    () => ({
      allTracks: tracks,
      currentId,
      playing,
      time,
      duration,
      volume,
      analyser,
      bpm: current?.bpm ?? null,
      eqGains,
      eqEnabled,
      preamp,
      setEqGain,
      setEqGains,
      setEqEnabled,
      setPreamp,
      cue,
      playTrack,
      toggle,
      next,
      prev,
      seek,
      setVolume,
    }),
    [
      tracks,
      currentId,
      playing,
      time,
      duration,
      volume,
      analyser,
      current,
      eqGains,
      eqEnabled,
      preamp,
      setEqGain,
      setEqGains,
      setEqEnabled,
      setPreamp,
      cue,
      playTrack,
      toggle,
      next,
      prev,
      seek,
      setVolume,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* The single shared audio engine. No native controls — the deck drives it. */}
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" hidden />
    </PlayerContext.Provider>
  );
}
