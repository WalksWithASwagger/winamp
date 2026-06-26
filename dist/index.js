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
  const [currentId, setCurrentId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [analyser, setAnalyser] = useState(null);
  const [eqGains, setEqGainsState] = useState(() => EQ_BANDS.map(() => 0));
  const eqGainsRef = useRef(EQ_BANDS.map(() => 0));
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
  const setEqGain = useCallback((band, db) => {
    const clamped = Math.max(-EQ_MAX_DB, Math.min(EQ_MAX_DB, db));
    if (eqGainsRef.current[band] === clamped) return;
    const next2 = eqGainsRef.current.slice();
    next2[band] = clamped;
    eqGainsRef.current = next2;
    setEqGainsState(next2);
    const f = eqRef.current[band];
    if (f) f.gain.value = clamped;
  }, []);
  const setEqGains = useCallback((gains) => {
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
      const nextIndex = i === -1 ? dir === 1 ? 0 : playable.length - 1 : (i + dir + playable.length) % playable.length;
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

// src/classic/skinSprites.ts
var SKIN_SPRITES = {
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
    { name: "MAIN_CLOSE_BUTTON_DEPRESSED", x: 18, y: 9, width: 9, height: 9 }
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
  style
}) {
  const skin = useSkinContext();
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);
  const v = Math.min(1, Math.max(0, value));
  const bgUri = skin?.sprites[background];
  const thumbUri = skin?.sprites[dragging && thumbActive ? thumbActive : thumb];
  const thumbW = SPRITE_DIMS[thumb]?.width ?? 0;
  const thumbH = SPRITE_DIMS[thumb]?.height ?? 0;
  const frameY = frames && frameHeight ? Math.round(v * (frames - 1)) * frameHeight : 0;
  const emit = (clientX) => {
    const el = ref.current;
    if (!el || !onChange) return;
    const rect = el.getBoundingClientRect();
    onChange(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
  };
  const onDown = (e) => {
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
    }
    emit(e.clientX);
  };
  const onMove = (e) => {
    if (dragging) emit(e.clientX);
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
            left: v * (trackWidth - thumbW),
            top: (trackHeight - thumbH) / 2,
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
var MAIN_WIDTH = 275;
var MAIN_HEIGHT = 116;
var STATIC = [
  ["MAIN_TITLE_BAR_SELECTED", 0, 0],
  ["MAIN_OPTIONS_BUTTON", 6, 3],
  ["MAIN_MINIMIZE_BUTTON", 244, 3],
  ["MAIN_CLOSE_BUTTON", 264, 3],
  ["MAIN_MONO", 212, 41],
  ["MAIN_STEREO", 239, 41],
  ["MAIN_EQ_BUTTON", 219, 58],
  ["MAIN_PLAYLIST_BUTTON", 242, 58],
  ["MAIN_SHUFFLE_BUTTON", 164, 89],
  ["MAIN_REPEAT_BUTTON", 210, 89],
  ["MAIN_EJECT_BUTTON", 136, 89]
];
var placed = (left, top) => ({
  position: "absolute",
  left,
  top
});
function ClassicWinampPlayer({
  skinUrl,
  scale = 1
}) {
  const { skin, status } = useSkin(skinUrl);
  const { playing, time, duration, volume, toggle, prev, next, seek, setVolume } = usePlayer();
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
  return /* @__PURE__ */ jsx(SkinProvider, { skin, children: /* @__PURE__ */ jsx(
    "div",
    {
      "data-skin-status": status,
      style: { width: MAIN_WIDTH * scale, height: MAIN_HEIGHT * scale },
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            position: "relative",
            width: MAIN_WIDTH,
            height: MAIN_HEIGHT,
            transform: scale === 1 ? void 0 : `scale(${scale})`,
            transformOrigin: "top left",
            imageRendering: "pixelated"
          },
          children: [
            /* @__PURE__ */ jsx(Sprite, { name: "MAIN_WINDOW_BACKGROUND", style: placed(0, 0) }),
            STATIC.map(([name, left, top]) => /* @__PURE__ */ jsx(Sprite, { name, style: placed(left, top) }, name)),
            /* @__PURE__ */ jsx(
              Sprite,
              {
                name: playing ? "MAIN_PLAYING_INDICATOR" : "MAIN_STOPPED_INDICATOR",
                style: placed(26, 28)
              }
            ),
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
            /* @__PURE__ */ jsx(SpriteButton, { up: "MAIN_PREVIOUS_BUTTON", down: "MAIN_PREVIOUS_BUTTON_ACTIVE", onClick: prev, title: "Previous", style: placed(16, 88) }),
            /* @__PURE__ */ jsx(SpriteButton, { up: "MAIN_PLAY_BUTTON", down: "MAIN_PLAY_BUTTON_ACTIVE", onClick: play, title: "Play", style: placed(39, 88) }),
            /* @__PURE__ */ jsx(SpriteButton, { up: "MAIN_PAUSE_BUTTON", down: "MAIN_PAUSE_BUTTON_ACTIVE", onClick: pause, title: "Pause", style: placed(62, 88) }),
            /* @__PURE__ */ jsx(SpriteButton, { up: "MAIN_STOP_BUTTON", down: "MAIN_STOP_BUTTON_ACTIVE", onClick: stop, title: "Stop", style: placed(85, 88) }),
            /* @__PURE__ */ jsx(SpriteButton, { up: "MAIN_NEXT_BUTTON", down: "MAIN_NEXT_BUTTON_ACTIVE", onClick: next, title: "Next", style: placed(108, 88) })
          ]
        }
      )
    }
  ) });
}

export { ClassicWinampPlayer, EQ_BANDS, EQ_MAX_DB, PlayerProvider, SKIN_SPRITES, SPRITE_DIMS, SkinProvider, Slider, Sprite, SpriteButton, WinampPlayer, parsePledit, parseSkin, parseViscolor, usePlayer, usePrefersReducedMotion, useSkin, useSkinContext };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map