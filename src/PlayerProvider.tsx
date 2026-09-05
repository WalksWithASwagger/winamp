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
  transportMode = "playlist",
  onTrackEnded,
  children,
}: {
  tracks: PlayerTrack[];
  /** Optional hook so a host app can react to the playing track (e.g. drive an
   *  ambient scene) without the player depending on anything app-specific. */
  onNowPlaying?: (info: NowPlaying) => void;
  transportMode?: "playlist" | "single";
  onTrackEnded?: (trackId: string) => void;
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
  const metadataReadyRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const positionRef = useRef(0);

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
    const fail = () => {
      if (token !== sourceTokenRef.current || trackId !== currentIdRef.current || intentRef.current !== "play") return;
      setPlaybackStatus("error");
      setPlaybackError({ trackId, code: "play" });
      setPlaying(false);
    };
    try {
      ensureGraph();
      void ctxRef.current?.resume().catch(fail);
      const result = el.play();
      void result?.catch(fail);
    } catch {
      fail();
    }
  }, [ensureGraph, setPlaybackStatus]);

  const applyPendingSeek = useCallback(() => {
    const el = audioRef.current;
    const requested = pendingSeekRef.current;
    if (!el || !metadataReadyRef.current || requested === null) return;
    const target = Number.isFinite(el.duration) ? Math.min(requested, el.duration) : requested;
    el.currentTime = target;
    pendingSeekRef.current = null;
    positionRef.current = target;
    setTime(target);
  }, []);

  const selectTrack = useCallback(
    (t: PlayerTrack, intent: "cue" | "play", reload: boolean, position = 0) => {
      const el = audioRef.current;
      if (!el || !t.audioUrl) return;
      sourceTokenRef.current += 1;
      currentIdRef.current = t.id;
      intentRef.current = intent;
      sourceRef.current = t.audioUrl;
      setCurrentId(t.id);
      metadataReadyRef.current = false;
      pendingSeekRef.current = position;
      positionRef.current = position;
      setTime(position);
      setDuration(0);
      setPlaying(false);
      setPlaybackError(null);
      setPlaybackStatus("loading");
      suppressPauseRef.current = true;
      if (reload || el.src !== t.audioUrl) el.src = t.audioUrl;
      // currentSrc can still identify the previous resource until load starts.
      sourceRef.current = el.src;
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
    [attemptPlay, driveScene, selectTrack, setPlaybackStatus, tracks],
  );

  const play = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!currentIdRef.current) {
      if (playable[0]) playTrack(playable[0].id);
      return;
    }
    if (el.paused) {
      intentRef.current = "play";
      setPlaybackError(null);
      setPlaybackStatus("loading");
      attemptPlay();
    }
  }, [attemptPlay, playable, playTrack, setPlaybackStatus]);

  const pause = useCallback(() => {
    intentRef.current = "cue";
    const el = audioRef.current;
    if (!el || el.paused) return;
    const position = el.currentTime;
    el.pause();
    // WebKit's Web Audio media clock can revert to the last seek on pause.
    if (ctxRef.current && metadataReadyRef.current) el.currentTime = position;
  }, []);

  const toggle = useCallback(() => {
    if (audioRef.current?.paused) play();
    else pause();
  }, [play, pause]);

  const retry = useCallback(() => {
    const id = currentIdRef.current;
    const t = id ? tracks.find((track) => track.id === id) : null;
    if (!t?.audioUrl) return;
    selectTrack(t, intentRef.current, true, positionRef.current);
  }, [selectTrack, tracks]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (transportMode === "single" || playable.length === 0) return;
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
    [playable, currentId, playTrack, transportMode],
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  const seek = useCallback((t: number) => {
    if (!currentIdRef.current || !Number.isFinite(t)) return;
    pendingSeekRef.current = Math.max(0, t);
    positionRef.current = pendingSeekRef.current;
    setTime(positionRef.current);
    applyPendingSeek();
  }, [applyPendingSeek]);

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
    set("play", play);
    set("pause", pause);
    set("previoustrack", transportMode === "single" ? null : prev);
    set("nexttrack", transportMode === "single" ? null : next);
    set("seekto", (d) => {
      if (typeof d.seekTime === "number") seek(d.seekTime);
    });
    return () => {
      for (const a of ["play", "pause", "previoustrack", "nexttrack", "seekto"] as const)
        set(a, null);
    };
  }, [play, pause, prev, next, seek, transportMode]);

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
    const onTime = (event: Event) => {
      if (!isCurrentMediaEvent(event) || pendingSeekRef.current !== null) return;
      positionRef.current = el.currentTime;
      setTime(el.currentTime);
    };
    const onDur = (event: Event) => {
      if (isCurrentMediaEvent(event)) setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    };
    const onMetadata = (event: Event) => {
      if (!isCurrentMediaEvent(event)) return;
      metadataReadyRef.current = true;
      onDur(event);
      applyPendingSeek();
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
      if (!el.paused) setPlaybackStatus("playing");
      else if (playbackStatusRef.current !== "paused") setPlaybackStatus("ready");
    };
    const onPlay = (event: Event) => {
      // A queued WebKit playing event can arrive after the next source is cued.
      if (!isCurrentMediaEvent(event) || el.paused) return;
      suppressPauseRef.current = false;
      setPlaying(true);
      setPlaybackError(null);
      setPlaybackStatus("playing");
    };
    const onPause = (event: Event) => {
      if (!isCurrentMediaEvent(event)) return;
      setPlaying(false);
      // A failed resource also emits pause; preserve the user's retry intent.
      if (suppressPauseRef.current || el.error || playbackStatusRef.current === "error") return;
      intentRef.current = "cue";
      setPlaybackStatus(currentIdRef.current ? "paused" : "idle");
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
      onTrackEnded?.(currentIdRef.current!);
      if (transportMode === "single") {
        intentRef.current = "cue";
        setPlaying(false);
        setPlaybackStatus("paused");
        positionRef.current = el.currentTime;
        setTime(el.currentTime);
        return;
      }
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
    el.addEventListener("loadedmetadata", onMetadata);
    el.addEventListener("loadstart", onLoadStart);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("play", onPlay);
    el.addEventListener("playing", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onBuffering);
    el.addEventListener("stalled", onBuffering);
    el.addEventListener("error", onError);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", onDur);
      el.removeEventListener("loadedmetadata", onMetadata);
      el.removeEventListener("loadstart", onLoadStart);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("playing", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onBuffering);
      el.removeEventListener("stalled", onBuffering);
      el.removeEventListener("error", onError);
      el.removeEventListener("ended", onEnded);
    };
  }, [attemptPlay, applyPendingSeek, onTrackEnded, setPlaybackStatus, step, transportMode, volume]);

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
