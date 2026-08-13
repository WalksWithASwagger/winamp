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
import type {
  NowPlaying,
  PlaybackError,
  PlaybackStatus,
  PlayerTrack,
} from "./types";

// Classic 10-band graphic-EQ centre frequencies (Winamp/ISO octave spacing).
export const EQ_BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
export const EQ_MAX_DB = 12;

type PlayerValue = {
  allTracks: PlayerTrack[];
  currentId: string | null;
  playing: boolean;
  playbackStatus: PlaybackStatus;
  playbackError: PlaybackError | null;
  time: number;
  duration: number;
  volume: number;
  analyser: AnalyserNode | null;
  bpm: number | null;
  eqGains: number[];
  eqEnabled: boolean;
  preamp: number;
  balance: number;
  shuffle: boolean;
  repeat: boolean;
  setEqGain: (band: number, db: number) => void;
  setEqGains: (gains: number[]) => void;
  setEqEnabled: (on: boolean) => void;
  setPreamp: (db: number) => void;
  setBalance: (v: number) => void;
  setShuffle: (on: boolean) => void;
  setRepeat: (on: boolean) => void;
  cue: (id: string) => void;
  playTrack: (id: string) => void;
  retry: () => void;
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
  const pannerRef = useRef<StereoPannerNode | null>(null);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatusState] = useState<PlaybackStatus>("idle");
  const [playbackError, setPlaybackError] = useState<PlaybackError | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [eqGains, setEqGainsState] = useState<number[]>(() => EQ_BANDS.map(() => 0));
  const [eqEnabled, setEqEnabledState] = useState(true);
  const [preamp, setPreampState] = useState(0);
  const [balance, setBalanceState] = useState(0);
  const [shuffle, setShuffleState] = useState(false);
  const [repeat, setRepeatState] = useState(false);
  // Mirrors of state, updated only inside the setters (never during render) so
  // the lazily-built graph + event handlers pick up values without stale closures.
  const eqGainsRef = useRef<number[]>(EQ_BANDS.map(() => 0));
  const eqEnabledRef = useRef(true);
  const preampRefDb = useRef(0);
  const balanceRefV = useRef(0);
  const shuffleRef = useRef(false);
  const repeatRef = useRef(false);
  const currentIdRef = useRef<string | null>(null);
  const sourceRef = useRef("");
  const sourceTokenRef = useRef(0);
  const playbackStatusRef = useRef<PlaybackStatus>("idle");
  const intentRef = useRef<"cue" | "play">("cue");
  const suppressPauseRef = useRef(false);

  const setPlaybackStatus = useCallback((status: PlaybackStatus) => {
    playbackStatusRef.current = status;
    setPlaybackStatusState(status);
  }, []);

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
    // Optional stereo balance after the analyser; not all engines have it.
    if (typeof ac.createStereoPanner === "function") {
      const panner = ac.createStereoPanner();
      panner.pan.value = balanceRefV.current;
      an.connect(panner);
      panner.connect(ac.destination);
      pannerRef.current = panner;
    } else {
      an.connect(ac.destination);
    }

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

  const setBalance = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(-1, v));
    balanceRefV.current = clamped;
    setBalanceState(clamped);
    if (pannerRef.current) pannerRef.current.pan.value = clamped;
  }, []);

  const setShuffle = useCallback((on: boolean) => {
    shuffleRef.current = on;
    setShuffleState(on);
  }, []);

  const setRepeat = useCallback((on: boolean) => {
    repeatRef.current = on;
    setRepeatState(on);
  }, []);

  const driveScene = useCallback(
    (t: PlayerTrack) => {
      onNowPlaying?.({ bpm: t.bpm, accent: t.art.palette[0] });
      // OS media controls / lock-screen metadata (feature-detected).
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: t.title,
          artist: t.person,
          artwork: t.coverImage ? [{ src: t.coverImage }] : [],
        });
      }
    },
    [onNowPlaying],
  );

  const attemptPlay = useCallback(() => {
    const el = audioRef.current;
    const trackId = currentIdRef.current;
    const token = sourceTokenRef.current;
    if (!el || !trackId) return;
    void ctxRef.current?.resume();
    try {
      const result = el.play();
      void result?.catch(() => {
        if (token !== sourceTokenRef.current || trackId !== currentIdRef.current) return;
        setPlaybackStatus("error");
        setPlaybackError({ trackId, code: "play" });
        setPlaying(false);
      });
    } catch {
      if (token !== sourceTokenRef.current || trackId !== currentIdRef.current) return;
      setPlaybackStatus("error");
      setPlaybackError({ trackId, code: "play" });
      setPlaying(false);
    }
  }, [setPlaybackStatus]);

  const selectTrack = useCallback(
    (t: PlayerTrack, intent: "cue" | "play", reload: boolean) => {
      const el = audioRef.current;
      if (!el || !t.audioUrl) return;
      sourceTokenRef.current += 1;
      currentIdRef.current = t.id;
      intentRef.current = intent;
      sourceRef.current = t.audioUrl;
      setCurrentId(t.id);
      setTime(0);
      setDuration(0);
      setPlaying(false);
      setPlaybackError(null);
      setPlaybackStatus("loading");
      suppressPauseRef.current = true;
      if (reload || el.src !== t.audioUrl) el.src = t.audioUrl;
      sourceRef.current = el.currentSrc || el.src || t.audioUrl;
      try {
        el.load();
      } catch {
        // jsdom does not implement media loading; browsers do.
      }
      driveScene(t);
      if (intent === "play") attemptPlay();
    },
    [attemptPlay, driveScene, setPlaybackStatus],
  );

  // Prime a track (load + select) WITHOUT playing — browsers block autoplay on
  // load, so a deep link can only ready the deck on that song, not start it.
  const cue = useCallback(
    (id: string) => {
      const t = tracks.find((track) => track.id === id);
      if (!t?.audioUrl || currentIdRef.current === id) return;
      selectTrack(t, "cue", false);
    },
    [tracks, selectTrack],
  );

  const playTrack = useCallback(
    (id: string) => {
      const t = tracks.find((track) => track.id === id);
      if (!t?.audioUrl) return;
      ensureGraph();
      if (currentIdRef.current !== id) {
        selectTrack(t, "play", false);
        return;
      }
      intentRef.current = "play";
      setPlaybackError(null);
      setPlaybackStatus("loading");
      driveScene(t);
      attemptPlay();
    },
    [attemptPlay, driveScene, ensureGraph, selectTrack, setPlaybackStatus, tracks],
  );

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!currentId) {
      if (playable[0]) playTrack(playable[0].id);
      return;
    }
    if (el.paused) {
      intentRef.current = "play";
      setPlaybackError(null);
      setPlaybackStatus("loading");
      attemptPlay();
    } else {
      el.pause();
    }
  }, [attemptPlay, currentId, playable, playTrack, setPlaybackStatus]);

  const retry = useCallback(() => {
    const id = currentIdRef.current;
    const t = id ? tracks.find((track) => track.id === id) : null;
    if (!t?.audioUrl) return;
    selectTrack(t, intentRef.current, true);
  }, [selectTrack, tracks]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (playable.length === 0) return;
      const i = playable.findIndex((t) => t.id === currentId);
      let nextIndex: number;
      if (shuffleRef.current && playable.length > 1) {
        // Random track other than the current one.
        do {
          nextIndex = Math.floor(Math.random() * playable.length);
        } while (nextIndex === i);
      } else {
        nextIndex =
          i === -1
            ? dir === 1
              ? 0
              : playable.length - 1
            : (i + dir + playable.length) % playable.length;
      }
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

  // OS media-key / lock-screen action handlers (feature-detected, bound once).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // some actions aren't supported in all browsers
      }
    };
    set("play", () => toggle());
    set("pause", () => toggle());
    set("previoustrack", () => prev());
    set("nexttrack", () => next());
    set("seekto", (d) => {
      if (typeof d.seekTime === "number") seek(d.seekTime);
    });
    return () => {
      for (const a of ["play", "pause", "previoustrack", "nexttrack", "seekto"] as const)
        set(a, null);
    };
  }, [toggle, prev, next, seek]);

  // Reflect play state on the OS media session.
  useEffect(() => {
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  }, [playing]);

  // Wire the single <audio> element to React state.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    const isCurrentMediaEvent = (event: Event) => {
      const currentSource = sourceRef.current;
      if (!currentSource || !currentIdRef.current) return false;
      const detail = (event as CustomEvent<{ src?: string }>).detail;
      const activeSource = el.currentSrc || el.src;
      if (detail?.src && detail.src !== currentSource && !currentSource.endsWith(detail.src)) return false;
      return Boolean(activeSource) && (activeSource === currentSource || currentSource.endsWith(activeSource));
    };
    const onTime = () => {
      if (currentIdRef.current) setTime(el.currentTime);
    };
    const onDur = () => {
      if (currentIdRef.current) setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    };
    const onLoadStart = (event: Event) => {
      if (!isCurrentMediaEvent(event)) return;
      setPlaybackError(null);
      setPlaybackStatus("loading");
    };
    const onCanPlay = (event: Event) => {
      if (!isCurrentMediaEvent(event)) return;
      suppressPauseRef.current = false;
      if (playbackStatusRef.current === "error") return;
      if (playbackStatusRef.current !== "playing") setPlaybackStatus("ready");
    };
    const onPlay = (event: Event) => {
      if (!isCurrentMediaEvent(event)) return;
      suppressPauseRef.current = false;
      setPlaying(true);
      setPlaybackError(null);
      setPlaybackStatus("playing");
    };
    const onPause = (event: Event) => {
      if (!isCurrentMediaEvent(event)) return;
      setPlaying(false);
      if (suppressPauseRef.current) return;
      if (playbackStatusRef.current !== "error") {
        setPlaybackStatus(currentIdRef.current ? "paused" : "idle");
      }
    };
    const onBuffering = (event: Event) => {
      if (!isCurrentMediaEvent(event)) return;
      setPlaybackStatus("loading");
    };
    const onError = (event: Event) => {
      if (!isCurrentMediaEvent(event)) return;
      const trackId = currentIdRef.current;
      if (!trackId) return;
      setPlaying(false);
      setPlaybackStatus("error");
      setPlaybackError({ trackId, code: "load" });
    };
    const onEnded = (event: Event) => {
      if (!isCurrentMediaEvent(event)) return;
      if (repeatRef.current) {
        el.currentTime = 0;
        intentRef.current = "play";
        attemptPlay();
      } else {
        step(1);
      }
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("durationchange", onDur);
    el.addEventListener("loadstart", onLoadStart);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onBuffering);
    el.addEventListener("stalled", onBuffering);
    el.addEventListener("error", onError);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", onDur);
      el.removeEventListener("loadstart", onLoadStart);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onBuffering);
      el.removeEventListener("stalled", onBuffering);
      el.removeEventListener("error", onError);
      el.removeEventListener("ended", onEnded);
    };
  }, [attemptPlay, setPlaybackStatus, step, volume]);

  const value = useMemo<PlayerValue>(
    () => ({
      allTracks: tracks,
      currentId,
      playing,
      playbackStatus,
      playbackError,
      time,
      duration,
      volume,
      analyser,
      bpm: current?.bpm ?? null,
      eqGains,
      eqEnabled,
      preamp,
      balance,
      shuffle,
      repeat,
      setEqGain,
      setEqGains,
      setEqEnabled,
      setPreamp,
      setBalance,
      setShuffle,
      setRepeat,
      cue,
      playTrack,
      retry,
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
      playbackStatus,
      playbackError,
      time,
      duration,
      volume,
      analyser,
      current,
      eqGains,
      eqEnabled,
      preamp,
      balance,
      shuffle,
      repeat,
      setEqGain,
      setEqGains,
      setEqEnabled,
      setPreamp,
      setBalance,
      setShuffle,
      setRepeat,
      cue,
      playTrack,
      retry,
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
