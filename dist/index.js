"use client";
import { createContext, useContext, useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useDragControls, useMotionValue, motion } from 'framer-motion';

// src/PlayerProvider.tsx
var EQ_BANDS = [60, 170, 310, 600, 1e3, 3e3, 6e3, 12e3, 14e3, 16e3];
var EQ_MAX_DB = 12;
var PlayerContext = createContext(null);
function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>");
  return ctx;
}
function PlayerProvider({
  tracks,
  onNowPlaying,
  children
}) {
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const srcRef = useRef(null);
  const analyserRef = useRef(null);
  const eqRef = useRef([]);
  const preampRef = useRef(null);
  const pannerRef = useRef(null);
  const [currentId, setCurrentId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [analyser, setAnalyser] = useState(null);
  const [eqGains, setEqGainsState] = useState(() => EQ_BANDS.map(() => 0));
  const [eqEnabled, setEqEnabledState] = useState(true);
  const [preamp, setPreampState] = useState(0);
  const [balance, setBalanceState] = useState(0);
  const [shuffle, setShuffleState] = useState(false);
  const [repeat, setRepeatState] = useState(false);
  const eqGainsRef = useRef(EQ_BANDS.map(() => 0));
  const eqEnabledRef = useRef(true);
  const preampRefDb = useRef(0);
  const balanceRefV = useRef(0);
  const shuffleRef = useRef(false);
  const repeatRef = useRef(false);
  const dbToGain = (db) => 10 ** (db / 20);
  const playable = useMemo(() => tracks.filter((t) => t.audioUrl), [tracks]);
  const current = currentId ? tracks.find((t) => t.id === currentId) ?? null : null;
  const ensureGraph = useCallback(() => {
    const el = audioRef.current;
    if (!el || ctxRef.current) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const src = ac.createMediaElementSource(el);
    const an = ac.createAnalyser();
    an.fftSize = 128;
    an.smoothingTimeConstant = 0.82;
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
    const tail = filters.reduce((prev2, f) => {
      prev2.connect(f);
      return f;
    }, preampNode);
    tail.connect(an);
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
  const setEqGain = useCallback((band, db) => {
    const clamped = Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, db));
    if (eqGainsRef.current[band] === clamped) return;
    const next2 = eqGainsRef.current.slice();
    next2[band] = clamped;
    eqGainsRef.current = next2;
    setEqGainsState(next2);
    const f = eqRef.current[band];
    if (f && eqEnabledRef.current) f.gain.value = clamped;
  }, []);
  const setEqGains = useCallback((gains) => {
    const norm = EQ_BANDS.map(
      (_, i) => Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, gains[i] ?? 0))
    );
    eqGainsRef.current = norm;
    setEqGainsState(norm);
    if (!eqEnabledRef.current) return;
    norm.forEach((g, i) => {
      const f = eqRef.current[i];
      if (f) f.gain.value = g;
    });
  }, []);
  const setEqEnabled = useCallback((on) => {
    eqEnabledRef.current = on;
    setEqEnabledState(on);
    eqRef.current.forEach((f, i) => {
      f.gain.value = on ? eqGainsRef.current[i] ?? 0 : 0;
    });
  }, []);
  const setPreamp = useCallback((db) => {
    const clamped = Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, db));
    preampRefDb.current = clamped;
    setPreampState(clamped);
    if (preampRef.current) preampRef.current.gain.value = dbToGain(clamped);
  }, []);
  const setBalance = useCallback((v) => {
    const clamped = Math.min(1, Math.max(-1, v));
    balanceRefV.current = clamped;
    setBalanceState(clamped);
    if (pannerRef.current) pannerRef.current.pan.value = clamped;
  }, []);
  const setShuffle = useCallback((on) => {
    shuffleRef.current = on;
    setShuffleState(on);
  }, []);
  const setRepeat = useCallback((on) => {
    repeatRef.current = on;
    setRepeatState(on);
  }, []);
  const driveScene = useCallback(
    (t) => {
      onNowPlaying?.({ bpm: t.bpm, accent: t.art.palette[0] });
    },
    [onNowPlaying]
  );
  const cue = useCallback(
    (id) => {
      const el = audioRef.current;
      const t = tracks.find((x) => x.id === id);
      if (!el || !t?.audioUrl || currentId === id) return;
      el.src = t.audioUrl;
      setCurrentId(id);
      setTime(0);
      driveScene(t);
    },
    [tracks, currentId, driveScene]
  );
  const playTrack = useCallback(
    (id) => {
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
    [tracks, currentId, ensureGraph, driveScene]
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
    (dir) => {
      if (playable.length === 0) return;
      const i = playable.findIndex((t) => t.id === currentId);
      let nextIndex;
      if (shuffleRef.current && playable.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * playable.length);
        } while (nextIndex === i);
      } else {
        nextIndex = i === -1 ? dir === 1 ? 0 : playable.length - 1 : (i + dir + playable.length) % playable.length;
      }
      playTrack(playable[nextIndex].id);
    },
    [playable, currentId, playTrack]
  );
  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);
  const seek = useCallback((t) => {
    const el = audioRef.current;
    if (el && Number.isFinite(t)) el.currentTime = t;
  }, []);
  const setVolume = useCallback((v) => {
    const el = audioRef.current;
    const clamped = Math.min(1, Math.max(0, v));
    if (el) el.volume = clamped;
    setVolumeState(clamped);
  }, []);
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    const onTime = () => setTime(el.currentTime);
    const onDur = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      if (repeatRef.current) {
        el.currentTime = 0;
        void el.play();
      } else {
        step(1);
      }
    };
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
  }, [step, volume]);
  const value = useMemo(
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
      toggle,
      next,
      prev,
      seek,
      setVolume
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
      toggle,
      next,
      prev,
      seek,
      setVolume
    ]
  );
  return /* @__PURE__ */ jsxs(PlayerContext.Provider, { value, children: [
    children,
    /* @__PURE__ */ jsx("audio", { ref: audioRef, preload: "none", crossOrigin: "anonymous", hidden: true })
  ] });
}
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
function Visualizer({ onClose }) {
  const { analyser } = usePlayer();
  const panelRef = useRef(null);
  const canvasRef = useRef(null);
  const vizRef = useRef(null);
  const presetsRef = useRef({});
  const keysRef = useRef([]);
  const idxRef = useRef(0);
  const [status, setStatus] = useState("loading");
  const [presetName, setPresetName] = useState("");
  const fit = useCallback(() => {
    const c = canvasRef.current;
    const v = vizRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(c.clientWidth * dpr));
    const h = Math.max(2, Math.round(c.clientHeight * dpr));
    c.width = w;
    c.height = h;
    v?.setRendererSize(w, h);
  }, []);
  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let raf = 0;
    let cycle;
    (async () => {
      try {
        const [bMod, pMod] = await Promise.all([
          import('butterchurn'),
          import('butterchurn-presets/lib/butterchurnPresetsMinimal.min.js')
        ]);
        if (cancelled) return;
        const butterchurn = bMod.default ?? bMod;
        const presetsLib = pMod.default ?? pMod;
        const presets = presetsLib.getPresets();
        const keys = Object.keys(presets);
        if (!keys.length) throw new Error("no presets");
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
        const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
        canvas.width = w;
        canvas.height = h;
        const viz = butterchurn.createVisualizer(analyser.context, canvas, {
          width: w,
          height: h,
          pixelRatio: 1,
          textureRatio: 1
        });
        viz.connectAudio(analyser);
        vizRef.current = viz;
        presetsRef.current = presets;
        keysRef.current = keys;
        let i = Math.floor(Math.random() * keys.length);
        idxRef.current = i;
        viz.loadPreset(presets[keys[i]], 0);
        setPresetName(keys[i]);
        cycle = setInterval(() => {
          i = (i + 1) % keys.length;
          idxRef.current = i;
          viz.loadPreset(presets[keys[i]], 2.7);
          setPresetName(keys[i]);
        }, 16e3);
        setStatus("ready");
        const loop = () => {
          viz.render();
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    })();
    const ro = new ResizeObserver(() => fit());
    ro.observe(canvas);
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (cycle) clearInterval(cycle);
      ro.disconnect();
      vizRef.current = null;
    };
  }, [analyser, fit]);
  const nextPreset = useCallback(() => {
    const keys = keysRef.current;
    const viz = vizRef.current;
    if (!viz || !keys.length) return;
    const i = (idxRef.current + 1) % keys.length;
    idxRef.current = i;
    viz.loadPreset(presetsRef.current[keys[i]], 2.7);
    setPresetName(keys[i]);
  }, []);
  const toggleFullscreen = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "deck-viz", ref: panelRef, children: [
    /* @__PURE__ */ jsx("canvas", { ref: canvasRef, className: "deck-viz-canvas", "aria-hidden": "true" }),
    /* @__PURE__ */ jsxs("div", { className: "deck-viz-bar", children: [
      /* @__PURE__ */ jsx("span", { className: "deck-viz-label", title: presetName || "milkdrop", children: status === "ready" && presetName ? presetName : "milkdrop" }),
      /* @__PURE__ */ jsx("span", { className: "deck-bar-fill", "aria-hidden": "true" }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "deck-winbtn", "aria-label": "Next preset", onClick: nextPreset, children: "\u21BB" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "deck-winbtn",
          "aria-label": "Fullscreen visualizer",
          onClick: toggleFullscreen,
          children: "\u26F6"
        }
      ),
      /* @__PURE__ */ jsx("button", { type: "button", className: "deck-winbtn", "aria-label": "Close visualizer", onClick: onClose, children: "\u2715" })
    ] }),
    (!analyser || status !== "ready") && /* @__PURE__ */ jsx("p", { className: "deck-viz-msg", children: !analyser ? "press play to see it move" : status === "unsupported" ? "visualizer needs WebGL2" : "loading milkdrop\u2026" })
  ] });
}
var EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [5, 4, 2, 0, -1, 0, 2, 4, 4, 5],
  Vocal: [-2, -1, 1, 3, 4, 4, 3, 1, 0, -1],
  Bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0]
};
function eqBandLabel(hz) {
  return hz >= 1e3 ? `${hz / 1e3}k` : `${hz}`;
}
function fmt(s) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
var DEFAULT_SPECTRUM_COLORS = ["#f47a52", "#fcd117", "#6dcad0", "#9b7bff", "#eaa8cb"];
function Spectrum({ colors }) {
  const { analyser, playing } = usePlayer();
  const reduced = usePrefersReducedMotion();
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const COLORS = colors;
    const BINS = 14;
    let raf = 0;
    let phase = 0;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const gap = 1;
      const bw = (w - gap * (BINS - 1)) / BINS;
      if (analyser && data && playing && !reduced) analyser.getByteFrequencyData(data);
      for (let i = 0; i < BINS; i++) {
        let v;
        if (analyser && data && playing && !reduced) {
          const idx = Math.floor(i / BINS * (data.length * 0.7));
          v = data[idx] / 255;
        } else {
          v = reduced ? 0.2 + i % 3 * 0.06 : 0.14 + Math.abs(Math.sin(phase + i * 0.5)) * 0.3;
        }
        const barH = Math.max(1, v * h);
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.globalAlpha = 0.5 + v * 0.5;
        ctx.fillRect(i * (bw + gap), h - barH, bw, barH);
      }
      ctx.globalAlpha = 1;
      phase += 0.06;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser, playing, reduced, colors]);
  return /* @__PURE__ */ jsx("canvas", { ref: canvasRef, width: 58, height: 16, className: "deck-spectrum" });
}
function WinampPlayer({
  storageKey = "deckState",
  wordmarkSrc = "/ethos-art/ethos-mask-cream.png",
  wordmarkText = "ETH\u1ECD\u0301S\xB7FM",
  spectrumColors = DEFAULT_SPECTRUM_COLORS
} = {}) {
  const {
    allTracks,
    currentId,
    playing,
    time,
    duration,
    volume,
    bpm,
    eqGains,
    setEqGain,
    setEqGains,
    cue,
    playTrack,
    toggle,
    next,
    prev,
    seek,
    setVolume
  } = usePlayer();
  const reduced = usePrefersReducedMotion();
  const [listOpen, setListOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shaded, setShaded] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [vizOpen, setVizOpen] = useState(false);
  const [canViz, setCanViz] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [easter, setEaster] = useState(false);
  const dragControls = useDragControls();
  const boundsRef = useRef(null);
  const deckRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const persist = useCallback(
    (patch) => {
      try {
        const cur = JSON.parse(localStorage.getItem(storageKey) || "{}");
        localStorage.setItem(storageKey, JSON.stringify({ ...cur, ...patch }));
      } catch {
      }
    },
    [storageKey]
  );
  useEffect(() => {
    const restore = () => {
      try {
        const s = JSON.parse(localStorage.getItem(storageKey) || "{}");
        if (typeof s.x === "number") x.set(s.x);
        if (typeof s.y === "number") y.set(s.y);
        if (typeof s.doubled === "boolean") setDoubled(s.doubled);
        if (Array.isArray(s.eq)) setEqGains(s.eq);
      } catch {
      }
    };
    const check = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      let gl2 = false;
      try {
        gl2 = !!document.createElement("canvas").getContext("webgl2");
      } catch {
        gl2 = false;
      }
      setCanViz(!mobile && window.innerWidth >= 760 && gl2 && !reduced);
    };
    const clampIntoView = () => {
      const el = deckRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const m = 6;
      let dx = 0;
      let dy = 0;
      if (r.right > window.innerWidth - m) dx = window.innerWidth - m - r.right;
      else if (r.left < m) dx = m - r.left;
      if (r.bottom > window.innerHeight - m) dy = window.innerHeight - m - r.bottom;
      else if (r.top < m) dy = m - r.top;
      if (dx) x.set(x.get() + dx);
      if (dy) y.set(y.get() + dy);
    };
    restore();
    check();
    requestAnimationFrame(clampIntoView);
    const onResize = () => {
      check();
      requestAnimationFrame(clampIntoView);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [x, y, reduced, storageKey, setEqGains]);
  useEffect(() => {
    const KONAMI = [
      "arrowup",
      "arrowup",
      "arrowdown",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "arrowleft",
      "arrowright",
      "b",
      "a"
    ];
    let seq = [];
    let timer;
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || t.isContentEditable))
        return;
      if (e.code === "Space") {
        if (!currentId) return;
        e.preventDefault();
        toggle();
        return;
      }
      seq.push(e.key.toLowerCase());
      if (seq.length > KONAMI.length) seq = seq.slice(-KONAMI.length);
      if (seq.length === KONAMI.length && KONAMI.every((k, i) => seq[i] === k)) {
        seq = [];
        setEaster(true);
        if (canViz) setVizOpen(true);
        clearTimeout(timer);
        timer = setTimeout(() => setEaster(false), 7e3);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [toggle, canViz, currentId]);
  const cuedRef = useRef(false);
  useEffect(() => {
    if (cuedRef.current) return;
    cuedRef.current = true;
    const id = new URLSearchParams(window.location.search).get("track");
    if (id && allTracks.some((t) => t.id === id && t.audioUrl)) cue(id);
  }, [allTracks, cue]);
  useEffect(() => {
    if (!currentId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("track") === currentId) return;
    url.searchParams.set("track", currentId);
    window.history.replaceState(null, "", url);
  }, [currentId]);
  const share = useCallback(() => {
    const url = new URL(window.location.href);
    if (currentId) url.searchParams.set("track", currentId);
    void navigator.clipboard?.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }, [currentId]);
  const startDrag = (e) => {
    if (isMobile) return;
    if (e.target.closest("button")) return;
    dragControls.start(e);
  };
  const onBarDoubleClick = (e) => {
    if (e.target.closest("button")) return;
    setShaded((v) => !v);
  };
  const current = currentId ? allTracks.find((t) => t.id === currentId) ?? null : null;
  const numLabel = current ? String(current.number).padStart(2, "0") : "--";
  const marquee = current ? `${numLabel}\xB7${current.title.toUpperCase()}  \xB7  ${current.person.toUpperCase()}${bpm ? `  \xB7  ${bpm} BPM` : ""}` : "ETH\u1ECD\u0301S BLOCK PARTY  \xB7  SELECT A TRACK";
  const displayMarquee = easter ? "\u266A  IT REALLY WHIPS THE LLAMA'S ASS  \u266A  \u{1F999}" : marquee;
  const marqueeRuns = (playing || easter) && !reduced;
  const playableCount = allTracks.filter((t) => t.audioUrl).length;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { ref: boundsRef, className: "deck-bounds", "aria-hidden": "true" }),
    /* @__PURE__ */ jsxs(
      motion.section,
      {
        ref: deckRef,
        className: `deck${shaded ? " is-shaded" : ""}`,
        "aria-label": "Block Party player",
        drag: !isMobile,
        dragControls,
        dragListener: false,
        dragMomentum: false,
        dragElastic: 0.12,
        dragConstraints: boundsRef,
        onDragEnd: () => persist({ x: x.get(), y: y.get() }),
        style: {
          x: isMobile ? 0 : x,
          y: isMobile ? 0 : y,
          scale: doubled && !isMobile ? 2 : 1,
          transformOrigin: "100% 0%",
          "--deck-accent": current?.art.palette[0] ?? "#f47a52"
        },
        children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: "deck-bar",
              onPointerDown: startDrag,
              onDoubleClick: onBarDoubleClick,
              children: [
                /* @__PURE__ */ jsx(
                  "img",
                  {
                    className: "deck-mark-img",
                    src: wordmarkSrc,
                    alt: "",
                    "aria-hidden": "true"
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "deck-wordmark", children: wordmarkText }),
                /* @__PURE__ */ jsx("span", { className: "deck-bar-fill", "aria-hidden": "true" }),
                /* @__PURE__ */ jsxs("div", { className: "deck-bar-btns", children: [
                  canViz && /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      className: `deck-winbtn${vizOpen ? " on" : ""}`,
                      "aria-pressed": vizOpen,
                      "aria-label": "Toggle visualizer",
                      title: "Milkdrop visualizer",
                      onClick: () => setVizOpen((v) => !v),
                      children: "\u25C9"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      className: `deck-winbtn deck-winbtn-eq${eqOpen ? " on" : ""}`,
                      "aria-pressed": eqOpen,
                      "aria-label": "Toggle equalizer",
                      title: "Equalizer",
                      onClick: () => setEqOpen((v) => !v),
                      children: "EQ"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      className: `deck-winbtn${listOpen ? " on" : ""}`,
                      "aria-pressed": listOpen,
                      "aria-label": "Toggle playlist",
                      onClick: () => setListOpen((v) => !v),
                      children: "\u2263"
                    }
                  ),
                  !isMobile && /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      className: `deck-winbtn${doubled ? " on" : ""}`,
                      "aria-pressed": doubled,
                      "aria-label": "Double size",
                      title: "Double size",
                      onClick: () => setDoubled((v) => {
                        persist({ doubled: !v });
                        return !v;
                      }),
                      children: "\u2922"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      className: `deck-winbtn${copied ? " on" : ""}`,
                      "aria-label": "Copy link to this track",
                      title: copied ? "Link copied" : "Share this track",
                      onClick: share,
                      children: copied ? "\u2713" : "\u2197"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      className: "deck-winbtn",
                      "aria-label": shaded ? "Expand player" : "Collapse player",
                      onClick: () => setShaded((v) => !v),
                      children: shaded ? "\u25A3" : "_"
                    }
                  )
                ] })
              ]
            }
          ),
          !shaded && /* @__PURE__ */ jsxs("div", { className: "deck-body", children: [
            /* @__PURE__ */ jsxs("div", { className: "deck-lcd", children: [
              current?.coverImage ? /* @__PURE__ */ jsx("img", { className: "deck-cover", src: current.coverImage, alt: "" }) : /* @__PURE__ */ jsx("span", { className: "deck-cover deck-cover-empty", "aria-hidden": "true" }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: "deck-time",
                  onClick: () => setShowRemaining((v) => !v),
                  "aria-label": showRemaining ? "Show elapsed time" : "Show remaining time",
                  title: showRemaining ? "Remaining" : "Elapsed",
                  children: showRemaining && duration ? `-${fmt(Math.max(0, duration - time))}` : fmt(time)
                }
              ),
              /* @__PURE__ */ jsx(Spectrum, { colors: spectrumColors }),
              /* @__PURE__ */ jsx("div", { className: "deck-marquee", "aria-live": "polite", children: /* @__PURE__ */ jsxs("span", { className: `deck-marquee-text${marqueeRuns ? " run" : ""}`, children: [
                displayMarquee,
                /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "deck-marquee-gap", children: "      \u25C8      " }),
                marqueeRuns ? displayMarquee : ""
              ] }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "deck-ctrl", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: "deck-key",
                  onClick: prev,
                  "aria-label": "Previous track",
                  children: "\u23EE"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: `deck-key deck-key-play${playing && !reduced ? " is-pulsing" : ""}`,
                  style: playing && bpm ? { "--beat": `${(60 / bpm).toFixed(3)}s` } : void 0,
                  onClick: toggle,
                  "aria-label": playing ? "Pause" : "Play",
                  children: playing ? "\u23F8" : "\u25B6"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: "deck-key",
                  onClick: next,
                  "aria-label": "Next track",
                  children: "\u23ED"
                }
              ),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "deck-seek",
                  type: "range",
                  min: 0,
                  max: duration || 0,
                  step: 0.1,
                  value: Math.min(time, duration || 0),
                  onChange: (e) => seek(Number(e.target.value)),
                  "aria-label": "Seek"
                }
              ),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "deck-vol",
                  type: "range",
                  min: 0,
                  max: 1,
                  step: 0.01,
                  value: volume,
                  onChange: (e) => setVolume(Number(e.target.value)),
                  "aria-label": "Volume",
                  title: "Volume"
                }
              )
            ] }),
            eqOpen && /* @__PURE__ */ jsxs("div", { className: "deck-eq-panel", children: [
              /* @__PURE__ */ jsx("div", { className: "deck-eq-presets", children: Object.keys(EQ_PRESETS).map((name) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: "deck-eq-preset",
                  onClick: () => {
                    const gains = EQ_PRESETS[name];
                    setEqGains(gains);
                    persist({ eq: gains });
                  },
                  children: name
                },
                name
              )) }),
              /* @__PURE__ */ jsx("div", { className: "deck-eq-bands", children: EQ_BANDS.map((hz, i) => /* @__PURE__ */ jsxs("div", { className: "deck-eq-band", children: [
                /* @__PURE__ */ jsx("span", { className: "deck-eq-slot", children: /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "deck-eq-slider",
                    type: "range",
                    min: -12,
                    max: 12,
                    step: 1,
                    value: eqGains[i] ?? 0,
                    onChange: (e) => {
                      const db = Number(e.target.value);
                      setEqGain(i, db);
                      const next2 = eqGains.slice();
                      next2[i] = db;
                      persist({ eq: next2 });
                    },
                    "aria-label": `${eqBandLabel(hz)} Hz, ${eqGains[i] ?? 0} decibels`
                  }
                ) }),
                /* @__PURE__ */ jsx("span", { className: "deck-eq-hz", "aria-hidden": "true", children: eqBandLabel(hz) })
              ] }, hz)) })
            ] }),
            listOpen && /* @__PURE__ */ jsxs("div", { className: "deck-list", children: [
              /* @__PURE__ */ jsxs("p", { className: "deck-list-head", children: [
                playableCount,
                "/",
                allTracks.length,
                " recorded"
              ] }),
              /* @__PURE__ */ jsx("ol", { className: "deck-list-rows", children: allTracks.map((t) => {
                const isCur = t.id === currentId;
                const can = Boolean(t.audioUrl);
                return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    className: `deck-row${isCur ? " cur" : ""}${can ? "" : " off"}`,
                    onClick: () => can && playTrack(t.id),
                    disabled: !can,
                    "aria-current": isCur || void 0,
                    children: [
                      t.coverImage ? /* @__PURE__ */ jsx("img", { className: "deck-row-cover", src: t.coverImage, alt: "" }) : /* @__PURE__ */ jsx(
                        "span",
                        {
                          className: "deck-row-cover deck-row-cover-empty",
                          "aria-hidden": "true"
                        }
                      ),
                      /* @__PURE__ */ jsx("span", { className: "deck-row-num", children: String(t.number).padStart(2, "0") }),
                      /* @__PURE__ */ jsx("span", { className: "deck-row-title", children: t.title }),
                      /* @__PURE__ */ jsx("span", { className: "deck-row-person", children: t.person }),
                      /* @__PURE__ */ jsx("span", { className: "deck-row-tag", children: isCur && playing ? /* @__PURE__ */ jsxs("span", { className: "deck-eq", "aria-hidden": "true", children: [
                        /* @__PURE__ */ jsx("i", {}),
                        /* @__PURE__ */ jsx("i", {}),
                        /* @__PURE__ */ jsx("i", {})
                      ] }) : can ? "\u25B8" : "\xB7" })
                    ]
                  }
                ) }, t.id);
              }) })
            ] }),
            vizOpen && canViz && /* @__PURE__ */ jsx(Visualizer, { onClose: () => setVizOpen(false) })
          ] })
        ]
      }
    )
  ] });
}

// src/classic/font.ts
var CHAR_W = 5;
var CHAR_H = 6;
var FONT_LOOKUP = {
  a: [0, 0],
  b: [0, 1],
  c: [0, 2],
  d: [0, 3],
  e: [0, 4],
  f: [0, 5],
  g: [0, 6],
  h: [0, 7],
  i: [0, 8],
  j: [0, 9],
  k: [0, 10],
  l: [0, 11],
  m: [0, 12],
  n: [0, 13],
  o: [0, 14],
  p: [0, 15],
  q: [0, 16],
  r: [0, 17],
  s: [0, 18],
  t: [0, 19],
  u: [0, 20],
  v: [0, 21],
  w: [0, 22],
  x: [0, 23],
  y: [0, 24],
  z: [0, 25],
  '"': [0, 26],
  "@": [0, 27],
  " ": [0, 30],
  "0": [1, 0],
  "1": [1, 1],
  "2": [1, 2],
  "3": [1, 3],
  "4": [1, 4],
  "5": [1, 5],
  "6": [1, 6],
  "7": [1, 7],
  "8": [1, 8],
  "9": [1, 9],
  ".": [1, 11],
  ":": [1, 12],
  "(": [1, 13],
  ")": [1, 14],
  "-": [1, 15],
  "'": [1, 16],
  "!": [1, 17],
  _: [1, 18],
  "+": [1, 19],
  "\\": [1, 20],
  "/": [1, 21],
  "[": [1, 22],
  "]": [1, 23],
  "^": [1, 24],
  "&": [1, 25],
  "%": [1, 26],
  ",": [1, 27],
  "=": [1, 28],
  $: [1, 29],
  "#": [1, 30],
  "?": [2, 3],
  "*": [2, 4]
};
var FONT_CHAR_WIDTH = CHAR_W;
var charSpriteName = (key) => `CHAR_${key.charCodeAt(0)}`;
var glyphFor = (ch) => {
  const key = ch.toLowerCase();
  return key in FONT_LOOKUP ? charSpriteName(key) : void 0;
};
var TEXT_SPRITES = Object.entries(FONT_LOOKUP).map(
  ([key, [row, col]]) => ({
    name: charSpriteName(key),
    x: col * CHAR_W,
    y: row * CHAR_H,
    width: CHAR_W,
    height: CHAR_H
  })
);

// src/classic/skinSprites.ts
var SKIN_SPRITES = {
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
    { name: "MAIN_EJECT_BUTTON_ACTIVE", x: 114, y: 16, width: 22, height: 16 }
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
    { name: "MAIN_SHADE_BACKGROUND_SELECTED", x: 27, y: 29, width: 275, height: 14 }
  ],
  MONOSTER: [
    { name: "MAIN_STEREO", x: 0, y: 12, width: 29, height: 12 },
    { name: "MAIN_STEREO_SELECTED", x: 0, y: 0, width: 29, height: 12 },
    { name: "MAIN_MONO", x: 29, y: 12, width: 27, height: 12 },
    { name: "MAIN_MONO_SELECTED", x: 29, y: 0, width: 27, height: 12 }
  ],
  PLAYPAUS: [
    { name: "MAIN_PLAYING_INDICATOR", x: 0, y: 0, width: 9, height: 9 },
    { name: "MAIN_PAUSED_INDICATOR", x: 9, y: 0, width: 9, height: 9 },
    { name: "MAIN_STOPPED_INDICATOR", x: 18, y: 0, width: 9, height: 9 },
    { name: "MAIN_WORKING_INDICATOR", x: 39, y: 0, width: 9, height: 9 }
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
    { name: "DIGIT_9", x: 81, y: 0, width: 9, height: 13 }
  ],
  POSBAR: [
    { name: "MAIN_POSITION_SLIDER_BACKGROUND", x: 0, y: 0, width: 248, height: 10 },
    { name: "MAIN_POSITION_SLIDER_THUMB", x: 248, y: 0, width: 29, height: 10 },
    { name: "MAIN_POSITION_SLIDER_THUMB_SELECTED", x: 278, y: 0, width: 29, height: 10 }
  ],
  VOLUME: [
    { name: "MAIN_VOLUME_BACKGROUND", x: 0, y: 0, width: 68, height: 420 },
    { name: "MAIN_VOLUME_THUMB", x: 15, y: 422, width: 14, height: 11 },
    { name: "MAIN_VOLUME_THUMB_SELECTED", x: 0, y: 422, width: 14, height: 11 }
  ],
  BALANCE: [
    { name: "MAIN_BALANCE_BACKGROUND", x: 9, y: 0, width: 38, height: 420 },
    { name: "MAIN_BALANCE_THUMB", x: 15, y: 422, width: 14, height: 11 },
    { name: "MAIN_BALANCE_THUMB_ACTIVE", x: 0, y: 422, width: 14, height: 11 }
  ],
  SHUFREP: [
    { name: "MAIN_SHUFFLE_BUTTON", x: 28, y: 0, width: 47, height: 15 },
    { name: "MAIN_SHUFFLE_BUTTON_SELECTED", x: 28, y: 30, width: 47, height: 15 },
    { name: "MAIN_REPEAT_BUTTON", x: 0, y: 0, width: 28, height: 15 },
    { name: "MAIN_REPEAT_BUTTON_SELECTED", x: 0, y: 30, width: 28, height: 15 },
    { name: "MAIN_EQ_BUTTON", x: 0, y: 61, width: 23, height: 12 },
    { name: "MAIN_EQ_BUTTON_SELECTED", x: 0, y: 73, width: 23, height: 12 },
    { name: "MAIN_PLAYLIST_BUTTON", x: 23, y: 61, width: 23, height: 12 },
    { name: "MAIN_PLAYLIST_BUTTON_SELECTED", x: 23, y: 73, width: 23, height: 12 }
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
    { name: "EQ_PRESETS_BUTTON_SELECTED", x: 224, y: 176, width: 44, height: 12 }
  ],
  PLEDIT: [
    { name: "PLAYLIST_TOP_LEFT_SELECTED", x: 0, y: 0, width: 25, height: 20 },
    { name: "PLAYLIST_TITLE_BAR_SELECTED", x: 26, y: 0, width: 100, height: 20 },
    { name: "PLAYLIST_TOP_TILE_SELECTED", x: 127, y: 0, width: 25, height: 20 },
    { name: "PLAYLIST_TOP_RIGHT_CORNER_SELECTED", x: 153, y: 0, width: 25, height: 20 },
    { name: "PLAYLIST_LEFT_TILE", x: 0, y: 42, width: 12, height: 29 },
    { name: "PLAYLIST_RIGHT_TILE", x: 31, y: 42, width: 20, height: 29 },
    { name: "PLAYLIST_BOTTOM_LEFT_CORNER", x: 0, y: 72, width: 125, height: 38 },
    { name: "PLAYLIST_BOTTOM_RIGHT_CORNER", x: 126, y: 72, width: 150, height: 38 }
  ]
};
var SPRITE_DIMS = Object.fromEntries(
  Object.values(SKIN_SPRITES).flat().map((s) => [s.name, { width: s.width, height: s.height }])
);

// src/classic/skinParser.ts
var DEFAULT_VISCOLOR = [
  "rgb(0,0,0)",
  "rgb(24,33,41)",
  "rgb(239,49,16)",
  "rgb(206,41,16)",
  "rgb(214,90,0)",
  "rgb(214,102,0)",
  "rgb(214,115,0)",
  "rgb(198,123,8)",
  "rgb(222,165,24)",
  "rgb(214,181,33)",
  "rgb(189,222,41)",
  "rgb(148,222,33)",
  "rgb(41,206,16)",
  "rgb(50,190,16)",
  "rgb(57,181,16)",
  "rgb(49,156,8)",
  "rgb(41,148,0)",
  "rgb(24,132,8)",
  "rgb(255,255,255)",
  "rgb(214,214,222)",
  "rgb(181,189,189)",
  "rgb(160,170,175)",
  "rgb(148,156,165)",
  "rgb(150,150,150)"
];
function parseViscolor(text) {
  const colors = text.split(/\r?\n/).map((line) => line.match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/)).filter((m) => m != null).map((m) => `rgb(${m[1]},${m[2]},${m[3]})`);
  return Array.from({ length: 24 }, (_, i) => colors[i] ?? DEFAULT_VISCOLOR[i]);
}
function parsePledit(text) {
  const get = (key) => {
    const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(#?[0-9a-fA-F]{6})`, "im"));
    if (!m) return void 0;
    return m[1].startsWith("#") ? m[1] : `#${m[1]}`;
  };
  return {
    playlistNormal: get("Normal"),
    playlistCurrent: get("Current"),
    playlistNormalBackground: get("NormalBG"),
    playlistSelectedBackground: get("SelectedBG")
  };
}
function cropSprite(bitmap, s) {
  const canvas = document.createElement("canvas");
  canvas.width = s.width;
  canvas.height = s.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("classic-skin: no 2d canvas context");
  ctx.drawImage(bitmap, s.x, s.y, s.width, s.height, 0, 0, s.width, s.height);
  return canvas.toDataURL();
}
async function parseSkin(buf) {
  const { unzipSync } = await import('fflate');
  const files = unzipSync(new Uint8Array(buf));
  const byName = /* @__PURE__ */ new Map();
  for (const [path, data] of Object.entries(files)) {
    byName.set(path.split("/").pop().toLowerCase(), data);
  }
  const sprites = {};
  for (const [bmp, defs] of Object.entries(SKIN_SPRITES)) {
    const data = byName.get(`${bmp.toLowerCase()}.bmp`);
    if (!data) continue;
    const bitmap = await createImageBitmap(
      new Blob([new Uint8Array(data)], { type: "image/bmp" })
    );
    for (const def of defs) sprites[def.name] = cropSprite(bitmap, def);
    bitmap.close?.();
  }
  const decode = (name) => {
    const data = byName.get(name);
    return data ? new TextDecoder().decode(data) : void 0;
  };
  const viscolorText = decode("viscolor.txt");
  const pleditText = decode("pledit.txt");
  return {
    sprites,
    colors: {
      viscolor: viscolorText ? parseViscolor(viscolorText) : DEFAULT_VISCOLOR,
      ...pleditText ? parsePledit(pleditText) : {}
    }
  };
}
var cache = /* @__PURE__ */ new Map();
function load(url) {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`skin fetch failed: ${r.status}`);
      return r.arrayBuffer();
    }).then(parseSkin);
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}
function useSkin(url) {
  const [state, setState] = useState({
    skin: null,
    status: url ? "loading" : "ready",
    error: null
  });
  useEffect(() => {
    if (!url) {
      setState({ skin: null, status: "ready", error: null });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, status: "loading", error: null }));
    load(url).then((skin) => {
      if (alive) setState({ skin, status: "ready", error: null });
    }).catch((error) => {
      if (alive) setState({ skin: null, status: "error", error });
    });
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}
var SkinContext = createContext(null);
function SkinProvider({
  skin,
  children
}) {
  return /* @__PURE__ */ jsx(SkinContext.Provider, { value: skin, children });
}
function useSkinContext() {
  return useContext(SkinContext);
}
var base = (name, uri) => ({
  width: SPRITE_DIMS[name]?.width,
  height: SPRITE_DIMS[name]?.height,
  backgroundImage: uri ? `url(${uri})` : void 0,
  backgroundRepeat: "no-repeat",
  imageRendering: "pixelated"
});
function Sprite({
  name,
  style
}) {
  const skin = useSkinContext();
  return /* @__PURE__ */ jsx("div", { style: { ...base(name, skin?.sprites[name]), ...style } });
}
function SpriteButton({
  up,
  down,
  onClick,
  title,
  style
}) {
  const skin = useSkinContext();
  const [pressed, setPressed] = useState(false);
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      title,
      "aria-label": title,
      onClick,
      onPointerDown: () => setPressed(true),
      onPointerUp: () => setPressed(false),
      onPointerLeave: () => setPressed(false),
      style: {
        ...base(up, skin?.sprites[pressed ? down : up]),
        padding: 0,
        border: "none",
        backgroundColor: "transparent",
        cursor: "pointer",
        ...style
      }
    }
  );
}
function Slider({
  background,
  thumb,
  thumbActive,
  value,
  onChange,
  trackWidth,
  trackHeight,
  frames,
  frameHeight,
  vertical = false,
  style
}) {
  const skin = useSkinContext();
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);
  const v = Math.min(1, Math.max(0, value));
  const bgUri = background ? skin?.sprites[background] : void 0;
  const thumbUri = skin?.sprites[dragging && thumbActive ? thumbActive : thumb];
  const thumbW = SPRITE_DIMS[thumb]?.width ?? 0;
  const thumbH = SPRITE_DIMS[thumb]?.height ?? 0;
  const frameY = frames && frameHeight ? Math.round(v * (frames - 1)) * frameHeight : 0;
  const emit = (clientX, clientY) => {
    const el = ref.current;
    if (!el || !onChange) return;
    const rect = el.getBoundingClientRect();
    const frac = vertical ? 1 - (clientY - rect.top) / rect.height : (clientX - rect.left) / rect.width;
    onChange(Math.min(1, Math.max(0, frac)));
  };
  const onDown = (e) => {
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
    }
    emit(e.clientX, e.clientY);
  };
  const onMove = (e) => {
    if (dragging) emit(e.clientX, e.clientY);
  };
  const stop = () => setDragging(false);
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      onPointerDown: onDown,
      onPointerMove: onMove,
      onPointerUp: stop,
      onPointerCancel: stop,
      style: {
        position: "absolute",
        width: trackWidth,
        height: trackHeight,
        backgroundImage: bgUri ? `url(${bgUri})` : void 0,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `0 -${frameY}px`,
        imageRendering: "pixelated",
        touchAction: "none",
        cursor: "pointer",
        ...style
      },
      children: /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            position: "absolute",
            left: vertical ? (trackWidth - thumbW) / 2 : v * (trackWidth - thumbW),
            top: vertical ? (1 - v) * (trackHeight - thumbH) : (trackHeight - thumbH) / 2,
            width: thumbW,
            height: thumbH,
            backgroundImage: thumbUri ? `url(${thumbUri})` : void 0,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
            pointerEvents: "none"
          }
        }
      )
    }
  );
}
var DIGIT_LEFT = [48, 60, 78, 90];
var DIGIT_TOP = 26;
function TimeDisplay({ seconds }) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.min(99, Math.floor(s / 60));
  const ss = s % 60;
  const digits = [
    mm >= 10 ? Math.floor(mm / 10) : null,
    mm % 10,
    Math.floor(ss / 10),
    ss % 10
  ];
  return /* @__PURE__ */ jsx(Fragment, { children: digits.map(
    (d, i) => d === null ? null : /* @__PURE__ */ jsx(
      Sprite,
      {
        name: `DIGIT_${d}`,
        style: { position: "absolute", left: DIGIT_LEFT[i], top: DIGIT_TOP }
      },
      i
    )
  ) });
}
function BitmapText({ text }) {
  return /* @__PURE__ */ jsx("div", { style: { display: "flex" }, children: [...text].map((ch, i) => {
    const name = glyphFor(ch) ?? glyphFor(" ");
    return /* @__PURE__ */ jsx(Sprite, { name }, i);
  }) });
}
function Marquee({
  text,
  width = 154,
  left = 111,
  top = 24
}) {
  const reduced = usePrefersReducedMotion();
  const [offset, setOffset] = useState(0);
  const textWidth = text.length * FONT_CHAR_WIDTH;
  const scrolls = textWidth > width && !reduced;
  useEffect(() => {
    if (!scrolls) {
      setOffset(0);
      return;
    }
    let raf = 0;
    let last = null;
    const loop = (t) => {
      if (last == null) last = t;
      const dt = t - last;
      last = t;
      setOffset((o) => o > textWidth + 10 ? -width : o + dt * 0.02);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scrolls, textWidth, width]);
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: { position: "absolute", left, top, width, height: 6, overflow: "hidden" },
      children: /* @__PURE__ */ jsx("div", { style: { position: "absolute", left: -Math.round(offset) }, children: /* @__PURE__ */ jsx(BitmapText, { text }) })
    }
  );
}
var VIZ_W = 76;
var VIZ_H = 16;
var BARS = 19;
function ClassicVisualizer({
  analyser,
  left = 24,
  top = 43
}) {
  const skin = useSkinContext();
  const ref = useRef(null);
  const viscolor = skin?.colors.viscolor;
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const colors = viscolor ?? [];
    const bg = colors[0] ?? "#000";
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let raf = 0;
    const draw = () => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, VIZ_W, VIZ_H);
      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        const barW = VIZ_W / BARS;
        for (let i = 0; i < BARS; i++) {
          const v = data[Math.floor(i / BARS * data.length * 0.7)] / 255;
          const h = Math.round(v * VIZ_H);
          for (let y = 0; y < h; y++) {
            ctx.fillStyle = colors[2 + Math.floor(y / VIZ_H * 16)] ?? "#0c0";
            ctx.fillRect(Math.floor(i * barW), VIZ_H - 1 - y, Math.ceil(barW) - 1 || 1, 1);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser, viscolor]);
  return /* @__PURE__ */ jsx(
    "canvas",
    {
      ref,
      width: VIZ_W,
      height: VIZ_H,
      style: { position: "absolute", left, top, width: VIZ_W, height: VIZ_H, imageRendering: "pixelated" }
    }
  );
}
function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined" || !key) return initial;
    try {
      const stored = window.localStorage.getItem(key);
      return stored == null ? initial : JSON.parse(stored);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    if (typeof window === "undefined" || !key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
  }, [key, value]);
  return [value, setValue];
}
var MAIN_WIDTH = 275;
var MAIN_HEIGHT = 116;
var SHADE_HEIGHT = 14;
var STATIC = [
  ["MAIN_TITLE_BAR_SELECTED", 0, 0],
  ["MAIN_OPTIONS_BUTTON", 6, 3],
  ["MAIN_MINIMIZE_BUTTON", 244, 3],
  ["MAIN_MONO", 212, 41],
  ["MAIN_STEREO", 239, 41],
  ["MAIN_EQ_BUTTON", 219, 58],
  ["MAIN_PLAYLIST_BUTTON", 242, 58],
  ["MAIN_EJECT_BUTTON", 136, 89]
];
var placed = (left, top) => ({
  position: "absolute",
  left,
  top
});
var fmtTime = (s) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
function ClassicWinampPlayer({
  skinUrl,
  scale = 1,
  storageKey = "classicWinamp"
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
    balance,
    shuffle,
    repeat,
    toggle,
    prev,
    next,
    seek,
    setVolume,
    setBalance,
    setShuffle,
    setRepeat
  } = usePlayer();
  const [shade, setShade] = usePersistedState(`${storageKey}:shade`, false);
  const [doubleSize, setDoubleSize] = usePersistedState(
    `${storageKey}:doubleSize`,
    false
  );
  const current = currentId ? allTracks.find((t) => t.id === currentId) : null;
  const title = current ? `${current.number}. ${current.title} - ${current.person}` : "WINAMP";
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
  const shadeButton = /* @__PURE__ */ jsx(
    SpriteButton,
    {
      up: "MAIN_SHADE_BUTTON",
      down: "MAIN_SHADE_BUTTON_DEPRESSED",
      onClick: () => setShade(!shade),
      title: shade ? "Restore" : "Windowshade",
      style: placed(254, 3)
    }
  );
  const closeBtn = /* @__PURE__ */ jsx(Sprite, { name: "MAIN_CLOSE_BUTTON", style: placed(264, 3) });
  const dblToggle = /* @__PURE__ */ jsx(
    "div",
    {
      onDoubleClick: () => setDoubleSize(!doubleSize),
      title: "Double-click to toggle double size",
      style: { position: "absolute", left: 30, top: 0, width: 210, height: 14, cursor: "pointer" }
    }
  );
  return /* @__PURE__ */ jsx(SkinProvider, { skin, children: /* @__PURE__ */ jsx(
    "div",
    {
      "data-skin-status": status,
      "data-shade": shade ? "true" : "false",
      style: { width: MAIN_WIDTH * s, height: height * s },
      children: /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            position: "relative",
            width: MAIN_WIDTH,
            height,
            transform: s === 1 ? void 0 : `scale(${s})`,
            transformOrigin: "top left",
            imageRendering: "pixelated"
          },
          children: shade ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Sprite, { name: "MAIN_SHADE_BACKGROUND_SELECTED", style: placed(0, 0) }),
            /* @__PURE__ */ jsx(Sprite, { name: "MAIN_OPTIONS_BUTTON", style: placed(6, 3) }),
            /* @__PURE__ */ jsx("div", { style: { position: "absolute", left: 130, top: 4 }, children: /* @__PURE__ */ jsx(BitmapText, { text: fmtTime(time) }) }),
            dblToggle,
            shadeButton,
            closeBtn
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Sprite, { name: "MAIN_WINDOW_BACKGROUND", style: placed(0, 0) }),
            STATIC.map(([name, left, top]) => /* @__PURE__ */ jsx(Sprite, { name, style: placed(left, top) }, name)),
            /* @__PURE__ */ jsx(
              Sprite,
              {
                name: playing ? "MAIN_PLAYING_INDICATOR" : "MAIN_STOPPED_INDICATOR",
                style: placed(26, 28)
              }
            ),
            /* @__PURE__ */ jsx(ClassicVisualizer, { analyser }),
            /* @__PURE__ */ jsx(TimeDisplay, { seconds: time }),
            /* @__PURE__ */ jsx(Marquee, { text: title }),
            dblToggle,
            shadeButton,
            closeBtn,
            /* @__PURE__ */ jsx(
              Slider,
              {
                background: "MAIN_POSITION_SLIDER_BACKGROUND",
                thumb: "MAIN_POSITION_SLIDER_THUMB",
                thumbActive: "MAIN_POSITION_SLIDER_THUMB_SELECTED",
                value: position,
                onChange: (v) => duration > 0 && seek(v * duration),
                trackWidth: 248,
                trackHeight: 10,
                style: placed(16, 72)
              }
            ),
            /* @__PURE__ */ jsx(
              Slider,
              {
                background: "MAIN_VOLUME_BACKGROUND",
                thumb: "MAIN_VOLUME_THUMB",
                thumbActive: "MAIN_VOLUME_THUMB_SELECTED",
                value: volume,
                onChange: setVolume,
                trackWidth: 68,
                trackHeight: 13,
                frames: 28,
                frameHeight: 15,
                style: placed(107, 57)
              }
            ),
            /* @__PURE__ */ jsx(
              Slider,
              {
                thumb: "MAIN_BALANCE_THUMB",
                thumbActive: "MAIN_BALANCE_THUMB_ACTIVE",
                value: (balance + 1) / 2,
                onChange: (v) => setBalance(v * 2 - 1),
                trackWidth: 38,
                trackHeight: 13,
                style: placed(177, 57)
              }
            ),
            /* @__PURE__ */ jsx(
              SpriteButton,
              {
                up: shuffle ? "MAIN_SHUFFLE_BUTTON_SELECTED" : "MAIN_SHUFFLE_BUTTON",
                down: shuffle ? "MAIN_SHUFFLE_BUTTON" : "MAIN_SHUFFLE_BUTTON_SELECTED",
                onClick: () => setShuffle(!shuffle),
                title: shuffle ? "Shuffle on" : "Shuffle off",
                style: placed(164, 89)
              }
            ),
            /* @__PURE__ */ jsx(
              SpriteButton,
              {
                up: repeat ? "MAIN_REPEAT_BUTTON_SELECTED" : "MAIN_REPEAT_BUTTON",
                down: repeat ? "MAIN_REPEAT_BUTTON" : "MAIN_REPEAT_BUTTON_SELECTED",
                onClick: () => setRepeat(!repeat),
                title: repeat ? "Repeat on" : "Repeat off",
                style: placed(210, 89)
              }
            ),
            /* @__PURE__ */ jsx(SpriteButton, { up: "MAIN_PREVIOUS_BUTTON", down: "MAIN_PREVIOUS_BUTTON_ACTIVE", onClick: prev, title: "Previous", style: placed(16, 88) }),
            /* @__PURE__ */ jsx(SpriteButton, { up: "MAIN_PLAY_BUTTON", down: "MAIN_PLAY_BUTTON_ACTIVE", onClick: play, title: "Play", style: placed(39, 88) }),
            /* @__PURE__ */ jsx(SpriteButton, { up: "MAIN_PAUSE_BUTTON", down: "MAIN_PAUSE_BUTTON_ACTIVE", onClick: pause, title: "Pause", style: placed(62, 88) }),
            /* @__PURE__ */ jsx(SpriteButton, { up: "MAIN_STOP_BUTTON", down: "MAIN_STOP_BUTTON_ACTIVE", onClick: stop, title: "Stop", style: placed(85, 88) }),
            /* @__PURE__ */ jsx(SpriteButton, { up: "MAIN_NEXT_BUTTON", down: "MAIN_NEXT_BUTTON_ACTIVE", onClick: next, title: "Next", style: placed(108, 88) })
          ] })
        }
      )
    }
  ) });
}
var W = 275;
var H = 116;
var BAND_TOP = 38;
var BAND_TRACK_H = 63;
var BAND_X0 = 78;
var BAND_STEP = 18;
var placed2 = (left, top) => ({
  position: "absolute",
  left,
  top
});
var gainToValue = (db) => (db + EQ_MAX_DB) / (2 * EQ_MAX_DB);
var valueToGain = (v) => v * 2 * EQ_MAX_DB - EQ_MAX_DB;
function EqGraph({ gains, preamp }) {
  const skin = useSkinContext();
  const ref = useRef(null);
  const line = skin?.colors.viscolor?.[18] ?? "#00ff00";
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 113, 19);
    const y = (db) => 9.5 - db / EQ_MAX_DB * 9;
    ctx.strokeStyle = line;
    ctx.beginPath();
    gains.forEach((g, i) => {
      const x = i / (gains.length - 1) * 113;
      const yy = y(g + preamp / 2);
      i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    });
    ctx.stroke();
  }, [gains, preamp, line]);
  return /* @__PURE__ */ jsx(
    "canvas",
    {
      ref,
      width: 113,
      height: 19,
      style: { ...placed2(86, 17), width: 113, height: 19, imageRendering: "pixelated" }
    }
  );
}
function ClassicEqWindow({
  skinUrl,
  scale = 1
}) {
  const { skin, status } = useSkin(skinUrl);
  const { eqGains, eqEnabled, preamp, setEqGain, setEqEnabled, setPreamp } = usePlayer();
  return /* @__PURE__ */ jsx(SkinProvider, { skin, children: /* @__PURE__ */ jsx("div", { "data-eq-status": status, style: { width: W * scale, height: H * scale }, children: /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        position: "relative",
        width: W,
        height: H,
        transform: scale === 1 ? void 0 : `scale(${scale})`,
        transformOrigin: "top left",
        imageRendering: "pixelated"
      },
      children: [
        /* @__PURE__ */ jsx(Sprite, { name: "EQ_WINDOW_BACKGROUND", style: placed2(0, 0) }),
        /* @__PURE__ */ jsx(Sprite, { name: "EQ_TITLE_BAR_SELECTED", style: placed2(0, 0) }),
        /* @__PURE__ */ jsx(
          SpriteButton,
          {
            up: eqEnabled ? "EQ_ON_BUTTON_SELECTED" : "EQ_ON_BUTTON",
            down: eqEnabled ? "EQ_ON_BUTTON" : "EQ_ON_BUTTON_SELECTED",
            onClick: () => setEqEnabled(!eqEnabled),
            title: eqEnabled ? "EQ on" : "EQ off",
            style: placed2(14, 18)
          }
        ),
        /* @__PURE__ */ jsx(Sprite, { name: "EQ_AUTO_BUTTON", style: placed2(40, 18) }),
        /* @__PURE__ */ jsx(Sprite, { name: "EQ_PRESETS_BUTTON", style: placed2(217, 18) }),
        /* @__PURE__ */ jsx(EqGraph, { gains: eqGains, preamp }),
        /* @__PURE__ */ jsx(
          Slider,
          {
            thumb: "EQ_SLIDER_THUMB",
            thumbActive: "EQ_SLIDER_THUMB_SELECTED",
            value: gainToValue(preamp),
            onChange: (v) => setPreamp(valueToGain(v)),
            trackWidth: 11,
            trackHeight: BAND_TRACK_H,
            vertical: true,
            style: placed2(21, BAND_TOP)
          }
        ),
        EQ_BANDS.map((_, i) => /* @__PURE__ */ jsx(
          Slider,
          {
            thumb: "EQ_SLIDER_THUMB",
            thumbActive: "EQ_SLIDER_THUMB_SELECTED",
            value: gainToValue(eqGains[i]),
            onChange: (v) => setEqGain(i, valueToGain(v)),
            trackWidth: 11,
            trackHeight: BAND_TRACK_H,
            vertical: true,
            style: placed2(BAND_X0 + i * BAND_STEP, BAND_TOP)
          },
          i
        ))
      ]
    }
  ) }) });
}
var W2 = 275;
var H2 = 116;
var TOP_H = 20;
var BOTTOM_H = 38;
var LEFT_W = 12;
var RIGHT_W = 20;
var TITLE_W = 100;
function Tile({
  name,
  left,
  top,
  width,
  height,
  repeat = "repeat"
}) {
  const skin = useSkinContext();
  const uri = skin?.sprites[name];
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        position: "absolute",
        left,
        top,
        width,
        height,
        backgroundImage: uri ? `url(${uri})` : void 0,
        backgroundRepeat: repeat,
        imageRendering: "pixelated"
      }
    }
  );
}
function ClassicPlaylistWindow({
  skinUrl,
  scale = 1
}) {
  const { skin, status } = useSkin(skinUrl);
  const { allTracks, currentId, playTrack } = usePlayer();
  const colors = skin?.colors;
  const normal = colors?.playlistNormal ?? "#00ff00";
  const current = colors?.playlistCurrent ?? "#ffffff";
  const bg = colors?.playlistNormalBackground ?? "#000000";
  const selectedBg = colors?.playlistSelectedBackground ?? "#0000c6";
  const titleLeft = Math.round((W2 - TITLE_W) / 2);
  return /* @__PURE__ */ jsx(SkinProvider, { skin, children: /* @__PURE__ */ jsx("div", { "data-pl-status": status, style: { width: W2 * scale, height: H2 * scale }, children: /* @__PURE__ */ jsxs(
    "div",
    {
      style: {
        position: "relative",
        width: W2,
        height: H2,
        transform: scale === 1 ? void 0 : `scale(${scale})`,
        transformOrigin: "top left",
        imageRendering: "pixelated"
      },
      children: [
        /* @__PURE__ */ jsx(Tile, { name: "PLAYLIST_TOP_TILE_SELECTED", left: 0, top: 0, width: W2, height: TOP_H, repeat: "repeat-x" }),
        /* @__PURE__ */ jsx(Tile, { name: "PLAYLIST_TOP_LEFT_SELECTED", left: 0, top: 0, width: 25, height: TOP_H, repeat: "no-repeat" }),
        /* @__PURE__ */ jsx(Tile, { name: "PLAYLIST_TITLE_BAR_SELECTED", left: titleLeft, top: 0, width: TITLE_W, height: TOP_H, repeat: "no-repeat" }),
        /* @__PURE__ */ jsx(Tile, { name: "PLAYLIST_TOP_RIGHT_CORNER_SELECTED", left: W2 - 25, top: 0, width: 25, height: TOP_H, repeat: "no-repeat" }),
        /* @__PURE__ */ jsx(Tile, { name: "PLAYLIST_LEFT_TILE", left: 0, top: TOP_H, width: LEFT_W, height: H2 - TOP_H - BOTTOM_H, repeat: "repeat-y" }),
        /* @__PURE__ */ jsx(Tile, { name: "PLAYLIST_RIGHT_TILE", left: W2 - RIGHT_W, top: TOP_H, width: RIGHT_W, height: H2 - TOP_H - BOTTOM_H, repeat: "repeat-y" }),
        /* @__PURE__ */ jsx(Tile, { name: "PLAYLIST_BOTTOM_LEFT_CORNER", left: 0, top: H2 - BOTTOM_H, width: 125, height: BOTTOM_H, repeat: "no-repeat" }),
        /* @__PURE__ */ jsx(Tile, { name: "PLAYLIST_BOTTOM_RIGHT_CORNER", left: 125, top: H2 - BOTTOM_H, width: 150, height: BOTTOM_H, repeat: "no-repeat" }),
        /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              position: "absolute",
              left: LEFT_W,
              top: TOP_H,
              width: W2 - LEFT_W - RIGHT_W,
              height: H2 - TOP_H - BOTTOM_H,
              background: bg,
              overflowY: "auto",
              font: "9px ui-monospace, monospace",
              lineHeight: "10px",
              whiteSpace: "nowrap"
            },
            children: allTracks.map((t) => {
              const isCurrent = t.id === currentId;
              const playable = !!t.audioUrl;
              return /* @__PURE__ */ jsxs(
                "div",
                {
                  onClick: () => playable && playTrack(t.id),
                  title: `${t.title} - ${t.person}`,
                  style: {
                    padding: "0 3px",
                    color: isCurrent ? current : normal,
                    background: isCurrent ? selectedBg : void 0,
                    opacity: playable ? 1 : 0.5,
                    cursor: playable ? "pointer" : "default",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  },
                  children: [
                    t.number,
                    ". ",
                    t.title,
                    " - ",
                    t.person
                  ]
                },
                t.id
              );
            })
          }
        )
      ]
    }
  ) }) });
}

// src/classic/skinMuseum.ts
var MUSEUM_CDN = "https://r2.webampskins.org/skins";
function skinMuseumUrl(md5) {
  return `${MUSEUM_CDN}/${md5}.wsz`;
}

export { BitmapText, ClassicEqWindow, ClassicPlaylistWindow, ClassicVisualizer, ClassicWinampPlayer, EQ_BANDS, EQ_MAX_DB, Marquee, PlayerProvider, SKIN_SPRITES, SPRITE_DIMS, SkinProvider, Slider, Sprite, SpriteButton, TimeDisplay, WinampPlayer, glyphFor, parsePledit, parseSkin, parseViscolor, skinMuseumUrl, usePlayer, usePrefersReducedMotion, useSkin, useSkinContext };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map