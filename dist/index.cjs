"use client";
'use strict';

var react = require('react');
var jsxRuntime = require('react/jsx-runtime');
var framerMotion = require('framer-motion');

// src/PlayerProvider.tsx
var EQ_BANDS = [60, 170, 310, 600, 1e3, 3e3, 6e3, 12e3, 14e3, 16e3];
var EQ_MAX_DB = 12;
var PlayerContext = react.createContext(null);
function usePlayer() {
  const ctx = react.useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>");
  return ctx;
}
function PlayerProvider({
  tracks,
  onNowPlaying,
  children
}) {
  const audioRef = react.useRef(null);
  const ctxRef = react.useRef(null);
  const srcRef = react.useRef(null);
  const analyserRef = react.useRef(null);
  const eqRef = react.useRef([]);
  const [currentId, setCurrentId] = react.useState(null);
  const [playing, setPlaying] = react.useState(false);
  const [time, setTime] = react.useState(0);
  const [duration, setDuration] = react.useState(0);
  const [volume, setVolumeState] = react.useState(0.85);
  const [analyser, setAnalyser] = react.useState(null);
  const [eqGains, setEqGainsState] = react.useState(() => EQ_BANDS.map(() => 0));
  const eqGainsRef = react.useRef(EQ_BANDS.map(() => 0));
  const playable = react.useMemo(() => tracks.filter((t) => t.audioUrl), [tracks]);
  const current = currentId ? tracks.find((t) => t.id === currentId) ?? null : null;
  const ensureGraph = react.useCallback(() => {
    const el = audioRef.current;
    if (!el || ctxRef.current) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const src = ac.createMediaElementSource(el);
    const an = ac.createAnalyser();
    an.fftSize = 128;
    an.smoothingTimeConstant = 0.82;
    const filters = EQ_BANDS.map((freq, i) => {
      const f = ac.createBiquadFilter();
      f.type = "peaking";
      f.frequency.value = freq;
      f.Q.value = 1;
      f.gain.value = eqGainsRef.current[i] ?? 0;
      return f;
    });
    const tail = filters.reduce((prev2, f) => {
      prev2.connect(f);
      return f;
    }, src);
    tail.connect(an);
    an.connect(ac.destination);
    ctxRef.current = ac;
    srcRef.current = src;
    analyserRef.current = an;
    eqRef.current = filters;
    setAnalyser(an);
  }, []);
  const setEqGain = react.useCallback((band, db) => {
    const clamped = Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, db));
    if (eqGainsRef.current[band] === clamped) return;
    const next2 = eqGainsRef.current.slice();
    next2[band] = clamped;
    eqGainsRef.current = next2;
    setEqGainsState(next2);
    const f = eqRef.current[band];
    if (f) f.gain.value = clamped;
  }, []);
  const setEqGains = react.useCallback((gains) => {
    const norm = EQ_BANDS.map(
      (_, i) => Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, gains[i] ?? 0))
    );
    eqGainsRef.current = norm;
    setEqGainsState(norm);
    norm.forEach((g, i) => {
      const f = eqRef.current[i];
      if (f) f.gain.value = g;
    });
  }, []);
  const driveScene = react.useCallback(
    (t) => {
      onNowPlaying?.({ bpm: t.bpm, accent: t.art.palette[0] });
    },
    [onNowPlaying]
  );
  const cue = react.useCallback(
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
  const playTrack = react.useCallback(
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
  const toggle = react.useCallback(() => {
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
  const step = react.useCallback(
    (dir) => {
      if (playable.length === 0) return;
      const i = playable.findIndex((t) => t.id === currentId);
      const nextIndex = i === -1 ? dir === 1 ? 0 : playable.length - 1 : (i + dir + playable.length) % playable.length;
      playTrack(playable[nextIndex].id);
    },
    [playable, currentId, playTrack]
  );
  const next = react.useCallback(() => step(1), [step]);
  const prev = react.useCallback(() => step(-1), [step]);
  const seek = react.useCallback((t) => {
    const el = audioRef.current;
    if (el && Number.isFinite(t)) el.currentTime = t;
  }, []);
  const setVolume = react.useCallback((v) => {
    const el = audioRef.current;
    const clamped = Math.min(1, Math.max(0, v));
    if (el) el.volume = clamped;
    setVolumeState(clamped);
  }, []);
  react.useEffect(() => {
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
  }, [step, volume]);
  const value = react.useMemo(
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
      setEqGain,
      setEqGains,
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
      setEqGain,
      setEqGains,
      cue,
      playTrack,
      toggle,
      next,
      prev,
      seek,
      setVolume
    ]
  );
  return /* @__PURE__ */ jsxRuntime.jsxs(PlayerContext.Provider, { value, children: [
    children,
    /* @__PURE__ */ jsxRuntime.jsx("audio", { ref: audioRef, preload: "none", crossOrigin: "anonymous", hidden: true })
  ] });
}
function usePrefersReducedMotion() {
  const [reduced, setReduced] = react.useState(false);
  react.useEffect(() => {
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
  const panelRef = react.useRef(null);
  const canvasRef = react.useRef(null);
  const vizRef = react.useRef(null);
  const presetsRef = react.useRef({});
  const keysRef = react.useRef([]);
  const idxRef = react.useRef(0);
  const [status, setStatus] = react.useState("loading");
  const [presetName, setPresetName] = react.useState("");
  const fit = react.useCallback(() => {
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
  react.useEffect(() => {
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
  const nextPreset = react.useCallback(() => {
    const keys = keysRef.current;
    const viz = vizRef.current;
    if (!viz || !keys.length) return;
    const i = (idxRef.current + 1) % keys.length;
    idxRef.current = i;
    viz.loadPreset(presetsRef.current[keys[i]], 2.7);
    setPresetName(keys[i]);
  }, []);
  const toggleFullscreen = react.useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "deck-viz", ref: panelRef, children: [
    /* @__PURE__ */ jsxRuntime.jsx("canvas", { ref: canvasRef, className: "deck-viz-canvas", "aria-hidden": "true" }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "deck-viz-bar", children: [
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-viz-label", title: presetName || "milkdrop", children: status === "ready" && presetName ? presetName : "milkdrop" }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-bar-fill", "aria-hidden": "true" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { type: "button", className: "deck-winbtn", "aria-label": "Next preset", onClick: nextPreset, children: "\u21BB" }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          className: "deck-winbtn",
          "aria-label": "Fullscreen visualizer",
          onClick: toggleFullscreen,
          children: "\u26F6"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx("button", { type: "button", className: "deck-winbtn", "aria-label": "Close visualizer", onClick: onClose, children: "\u2715" })
    ] }),
    (!analyser || status !== "ready") && /* @__PURE__ */ jsxRuntime.jsx("p", { className: "deck-viz-msg", children: !analyser ? "press play to see it move" : status === "unsupported" ? "visualizer needs WebGL2" : "loading milkdrop\u2026" })
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
  const canvasRef = react.useRef(null);
  react.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntime.jsx("canvas", { ref: canvasRef, width: 58, height: 16, className: "deck-spectrum" });
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
  const [listOpen, setListOpen] = react.useState(false);
  const [eqOpen, setEqOpen] = react.useState(false);
  const [showRemaining, setShowRemaining] = react.useState(false);
  const [copied, setCopied] = react.useState(false);
  const [shaded, setShaded] = react.useState(false);
  const [doubled, setDoubled] = react.useState(false);
  const [vizOpen, setVizOpen] = react.useState(false);
  const [canViz, setCanViz] = react.useState(false);
  const [isMobile, setIsMobile] = react.useState(false);
  const [easter, setEaster] = react.useState(false);
  const dragControls = framerMotion.useDragControls();
  const boundsRef = react.useRef(null);
  const deckRef = react.useRef(null);
  const x = framerMotion.useMotionValue(0);
  const y = framerMotion.useMotionValue(0);
  const persist = react.useCallback(
    (patch) => {
      try {
        const cur = JSON.parse(localStorage.getItem(storageKey) || "{}");
        localStorage.setItem(storageKey, JSON.stringify({ ...cur, ...patch }));
      } catch {
      }
    },
    [storageKey]
  );
  react.useEffect(() => {
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
  react.useEffect(() => {
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
  const cuedRef = react.useRef(false);
  react.useEffect(() => {
    if (cuedRef.current) return;
    cuedRef.current = true;
    const id = new URLSearchParams(window.location.search).get("track");
    if (id && allTracks.some((t) => t.id === id && t.audioUrl)) cue(id);
  }, [allTracks, cue]);
  react.useEffect(() => {
    if (!currentId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("track") === currentId) return;
    url.searchParams.set("track", currentId);
    window.history.replaceState(null, "", url);
  }, [currentId]);
  const share = react.useCallback(() => {
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
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx("div", { ref: boundsRef, className: "deck-bounds", "aria-hidden": "true" }),
    /* @__PURE__ */ jsxRuntime.jsxs(
      framerMotion.motion.section,
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
          /* @__PURE__ */ jsxRuntime.jsxs(
            "div",
            {
              className: "deck-bar",
              onPointerDown: startDrag,
              onDoubleClick: onBarDoubleClick,
              children: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  "img",
                  {
                    className: "deck-mark-img",
                    src: wordmarkSrc,
                    alt: "",
                    "aria-hidden": "true"
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-wordmark", children: wordmarkText }),
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-bar-fill", "aria-hidden": "true" }),
                /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "deck-bar-btns", children: [
                  canViz && /* @__PURE__ */ jsxRuntime.jsx(
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
                  /* @__PURE__ */ jsxRuntime.jsx(
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
                  /* @__PURE__ */ jsxRuntime.jsx(
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
                  !isMobile && /* @__PURE__ */ jsxRuntime.jsx(
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
                  /* @__PURE__ */ jsxRuntime.jsx(
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
                  /* @__PURE__ */ jsxRuntime.jsx(
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
          !shaded && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "deck-body", children: [
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "deck-lcd", children: [
              current?.coverImage ? /* @__PURE__ */ jsxRuntime.jsx("img", { className: "deck-cover", src: current.coverImage, alt: "" }) : /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-cover deck-cover-empty", "aria-hidden": "true" }),
              /* @__PURE__ */ jsxRuntime.jsx(
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
              /* @__PURE__ */ jsxRuntime.jsx(Spectrum, { colors: spectrumColors }),
              /* @__PURE__ */ jsxRuntime.jsx("div", { className: "deck-marquee", "aria-live": "polite", children: /* @__PURE__ */ jsxRuntime.jsxs("span", { className: `deck-marquee-text${marqueeRuns ? " run" : ""}`, children: [
                displayMarquee,
                /* @__PURE__ */ jsxRuntime.jsx("span", { "aria-hidden": "true", className: "deck-marquee-gap", children: "      \u25C8      " }),
                marqueeRuns ? displayMarquee : ""
              ] }) })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "deck-ctrl", children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  className: "deck-key",
                  onClick: prev,
                  "aria-label": "Previous track",
                  children: "\u23EE"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
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
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  className: "deck-key",
                  onClick: next,
                  "aria-label": "Next track",
                  children: "\u23ED"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
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
              /* @__PURE__ */ jsxRuntime.jsx(
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
            eqOpen && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "deck-eq-panel", children: [
              /* @__PURE__ */ jsxRuntime.jsx("div", { className: "deck-eq-presets", children: Object.keys(EQ_PRESETS).map((name) => /* @__PURE__ */ jsxRuntime.jsx(
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
              /* @__PURE__ */ jsxRuntime.jsx("div", { className: "deck-eq-bands", children: EQ_BANDS.map((hz, i) => /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "deck-eq-band", children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-eq-slot", children: /* @__PURE__ */ jsxRuntime.jsx(
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
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-eq-hz", "aria-hidden": "true", children: eqBandLabel(hz) })
              ] }, hz)) })
            ] }),
            listOpen && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "deck-list", children: [
              /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "deck-list-head", children: [
                playableCount,
                "/",
                allTracks.length,
                " recorded"
              ] }),
              /* @__PURE__ */ jsxRuntime.jsx("ol", { className: "deck-list-rows", children: allTracks.map((t) => {
                const isCur = t.id === currentId;
                const can = Boolean(t.audioUrl);
                return /* @__PURE__ */ jsxRuntime.jsx("li", { children: /* @__PURE__ */ jsxRuntime.jsxs(
                  "button",
                  {
                    type: "button",
                    className: `deck-row${isCur ? " cur" : ""}${can ? "" : " off"}`,
                    onClick: () => can && playTrack(t.id),
                    disabled: !can,
                    "aria-current": isCur || void 0,
                    children: [
                      t.coverImage ? /* @__PURE__ */ jsxRuntime.jsx("img", { className: "deck-row-cover", src: t.coverImage, alt: "" }) : /* @__PURE__ */ jsxRuntime.jsx(
                        "span",
                        {
                          className: "deck-row-cover deck-row-cover-empty",
                          "aria-hidden": "true"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-row-num", children: String(t.number).padStart(2, "0") }),
                      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-row-title", children: t.title }),
                      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-row-person", children: t.person }),
                      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "deck-row-tag", children: isCur && playing ? /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "deck-eq", "aria-hidden": "true", children: [
                        /* @__PURE__ */ jsxRuntime.jsx("i", {}),
                        /* @__PURE__ */ jsxRuntime.jsx("i", {}),
                        /* @__PURE__ */ jsxRuntime.jsx("i", {})
                      ] }) : can ? "\u25B8" : "\xB7" })
                    ]
                  }
                ) }, t.id);
              }) })
            ] }),
            vizOpen && canViz && /* @__PURE__ */ jsxRuntime.jsx(Visualizer, { onClose: () => setVizOpen(false) })
          ] })
        ]
      }
    )
  ] });
}

exports.EQ_BANDS = EQ_BANDS;
exports.EQ_MAX_DB = EQ_MAX_DB;
exports.PlayerProvider = PlayerProvider;
exports.WinampPlayer = WinampPlayer;
exports.usePlayer = usePlayer;
exports.usePrefersReducedMotion = usePrefersReducedMotion;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map