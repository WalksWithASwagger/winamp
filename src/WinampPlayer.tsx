"use client";

/* eslint-disable @next/next/no-img-element -- local PNG album art, not remote */
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useDragControls,
  useMotionValue,
  type MotionStyle,
} from "framer-motion";
import { EQ_BANDS, usePlayer } from "./PlayerProvider";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { Visualizer } from "./Visualizer";
import { THEMES, type DeckTheme } from "./themes";
import { usePlayerKeyboardShortcuts } from "./usePlayerKeyboardShortcuts";

// Graphic-EQ presets — 10 gains (dB) aligned to EQ_BANDS. Flat = passthrough.
const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [5, 4, 2, 0, -1, 0, 2, 4, 4, 5],
  Vocal: [-2, -1, 1, 3, 4, 4, 3, 1, 0, -1],
  Bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  Treble: [-2, -2, -1, 0, 1, 3, 5, 6, 6, 6],
  Classical: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  Dance: [6, 5, 2, 0, 0, -2, -3, -3, 0, 0],
  Loudness: [6, 4, 0, 0, -2, 0, -1, -4, 5, 1],
};

function eqBandLabel(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
}

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const DEFAULT_SPECTRUM_COLORS = ["#f47a52", "#fcd117", "#6dcad0", "#9b7bff", "#eaa8cb"];

// Tiny live frequency bars off the shared AnalyserNode. Falls back to a calm
// idle shimmer when nothing has played yet or reduced-motion is requested.
function Spectrum({ colors }: { colors: string[] }) {
  const { analyser, playing } = usePlayer();
  const reduced = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        let v: number;
        if (analyser && data && playing && !reduced) {
          const idx = Math.floor((i / BINS) * (data.length * 0.7));
          v = data[idx] / 255;
        } else {
          v = reduced
            ? 0.2 + (i % 3) * 0.06
            : 0.14 + Math.abs(Math.sin(phase + i * 0.5)) * 0.3;
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

  return <canvas ref={canvasRef} width={58} height={16} className="deck-spectrum" />;
}

export function WinampPlayer({
  storageKey = "deckState",
  wordmarkSrc,
  wordmarkText = "ETHọ́S·FM",
  spectrumColors,
  theme,
}: {
  storageKey?: string;
  wordmarkSrc?: string;
  wordmarkText?: string;
  spectrumColors?: string[];
  /** Named theme pack for the modern deck (distinct from .wsz classic skins). */
  theme?: DeckTheme;
} = {}) {
  const themePack = theme ? THEMES[theme] : undefined;
  const spectrum = spectrumColors ?? themePack?.spectrum ?? DEFAULT_SPECTRUM_COLORS;
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
    setVolume,
  } = usePlayer();
  const reduced = usePrefersReducedMotion();
  const [listOpen, setListOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shaded, setShaded] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [eqPreset, setEqPreset] = useState<string | null>(null);
  const [vizOpen, setVizOpen] = useState(false);
  const [canViz, setCanViz] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [easter, setEaster] = useState(false);
  const dragControls = useDragControls();
  const boundsRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const persist = useCallback(
    (patch: Record<string, unknown>) => {
      try {
        const cur = JSON.parse(localStorage.getItem(storageKey) || "{}");
        localStorage.setItem(storageKey, JSON.stringify({ ...cur, ...patch }));
      } catch {
        /* private mode / no storage — non-fatal */
      }
    },
    [storageKey],
  );

  // Restore saved position + size; detect mobile + WebGL2 (gates the visualizer).
  useEffect(() => {
    const restore = () => {
      try {
        const s = JSON.parse(localStorage.getItem(storageKey) || "{}");
        if (typeof s.x === "number") x.set(s.x);
        if (typeof s.y === "number") y.set(s.y);
        if (typeof s.doubled === "boolean") setDoubled(s.doubled);
        if (Array.isArray(s.eq)) setEqGains(s.eq);
        if (typeof s.eqPreset === "string") setEqPreset(s.eqPreset);
      } catch {
        /* ignore */
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
    // Pull the deck back on-screen if a saved position + a smaller window would
    // leave it (partly) outside the viewport.
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

  // Space / arrow-key media shortcuts (reusable hook).
  usePlayerKeyboardShortcuts();

  // The Konami code flips on a little easter egg.
  useEffect(() => {
    const KONAMI = [
      "arrowup", "arrowup", "arrowdown", "arrowdown",
      "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a",
    ];
    let seq: string[] = [];
    let timer: ReturnType<typeof setTimeout>;
    const onKey = (e: KeyboardEvent) => {
      seq.push(e.key.toLowerCase());
      if (seq.length > KONAMI.length) seq = seq.slice(-KONAMI.length);
      if (seq.length === KONAMI.length && KONAMI.every((k, i) => seq[i] === k)) {
        seq = [];
        setEaster(true);
        if (canViz) setVizOpen(true);
        clearTimeout(timer);
        timer = setTimeout(() => setEaster(false), 7000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [canViz]);
  // (The viz button + panel are guarded by `canViz`, so they auto-hide when it
  // becomes false — no separate close effect needed.)

  // Deep link: a `?track=<id>` URL primes the deck on that song (cued, not
  // auto-played — browsers block autoplay). Runs once on mount.
  const cuedRef = useRef(false);
  useEffect(() => {
    if (cuedRef.current) return;
    cuedRef.current = true;
    const id = new URLSearchParams(window.location.search).get("track");
    if (id && allTracks.some((t) => t.id === id && t.audioUrl)) cue(id);
  }, [allTracks, cue]);

  // Keep the URL pointing at the current song so a copied link reopens here.
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

  const startDrag = (e: ReactPointerEvent) => {
    if (isMobile) return;
    if ((e.target as HTMLElement).closest("button")) return;
    dragControls.start(e);
  };
  const onBarDoubleClick = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setShaded((v) => !v);
  };

  const current = currentId
    ? allTracks.find((t) => t.id === currentId) ?? null
    : null;
  const numLabel = current ? String(current.number).padStart(2, "0") : "--";
  const marquee = current
    ? `${numLabel}·${current.title.toUpperCase()}  ·  ${current.person.toUpperCase()}${bpm ? `  ·  ${bpm} BPM` : ""}`
    : "ETHọ́S BLOCK PARTY  ·  SELECT A TRACK";
  const displayMarquee = easter
    ? "♪  IT REALLY WHIPS THE LLAMA'S ASS  ♪  🦙"
    : marquee;
  const marqueeRuns = (playing || easter) && !reduced;
  const playableCount = allTracks.filter((t) => t.audioUrl).length;

  return (
    <>
      <div ref={boundsRef} className="deck-bounds" aria-hidden="true" />
      <motion.section
        ref={deckRef}
        className={`deck${shaded ? " is-shaded" : ""}`}
        aria-label="Block Party player"
        drag={!isMobile}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0.12}
        dragConstraints={boundsRef}
        onDragEnd={() => persist({ x: x.get(), y: y.get() })}
        style={
          {
            x: isMobile ? 0 : x,
            y: isMobile ? 0 : y,
            scale: doubled && !isMobile ? 2 : 1,
            transformOrigin: "100% 0%",
            ...themePack?.vars,
            // Per-track palette tints over the theme; theme accent is the fallback.
            "--deck-accent":
              current?.art.palette[0] ?? themePack?.vars["--deck-accent"] ?? "#f47a52",
          } as MotionStyle
        }
      >
        {/* title bar (drag handle + double-click to shade) */}
        <div
          className="deck-bar"
          onPointerDown={startDrag}
          onDoubleClick={onBarDoubleClick}
        >
        {wordmarkSrc && (
          <img
            className="deck-mark-img"
            src={wordmarkSrc}
            alt=""
            aria-hidden="true"
          />
        )}
        <span className="deck-wordmark">{wordmarkText}</span>
        <span className="deck-bar-fill" aria-hidden="true" />
        <div className="deck-bar-btns">
          {canViz && (
            <button
              type="button"
              className={`deck-winbtn${vizOpen ? " on" : ""}`}
              aria-pressed={vizOpen}
              aria-label="Toggle visualizer"
              title="Milkdrop visualizer"
              onClick={() => setVizOpen((v) => !v)}
            >
              ◉
            </button>
          )}
          <button
            type="button"
            className={`deck-winbtn deck-winbtn-eq${eqOpen ? " on" : ""}`}
            aria-pressed={eqOpen}
            aria-label="Toggle equalizer"
            title="Equalizer"
            onClick={() => setEqOpen((v) => !v)}
          >
            EQ
          </button>
          <button
            type="button"
            className={`deck-winbtn${listOpen ? " on" : ""}`}
            aria-pressed={listOpen}
            aria-label="Toggle playlist"
            onClick={() => setListOpen((v) => !v)}
          >
            ≣
          </button>
          {!isMobile && (
            <button
              type="button"
              className={`deck-winbtn${doubled ? " on" : ""}`}
              aria-pressed={doubled}
              aria-label="Double size"
              title="Double size"
              onClick={() =>
                setDoubled((v) => {
                  persist({ doubled: !v });
                  return !v;
                })
              }
            >
              ⤢
            </button>
          )}
          <button
            type="button"
            className={`deck-winbtn${copied ? " on" : ""}`}
            aria-label="Copy link to this track"
            title={copied ? "Link copied" : "Share this track"}
            onClick={share}
          >
            {copied ? "✓" : "↗"}
          </button>
          <button
            type="button"
            className="deck-winbtn"
            aria-label={shaded ? "Expand player" : "Collapse player"}
            onClick={() => setShaded((v) => !v)}
          >
            {shaded ? "▣" : "_"}
          </button>
        </div>
      </div>

      {!shaded && (
        <div className="deck-body">
          {/* LCD strip: time · spectrum · scrolling title */}
          <div className="deck-lcd">
            {current?.coverImage ? (
              <img className="deck-cover" src={current.coverImage} alt="" />
            ) : (
              <span className="deck-cover deck-cover-empty" aria-hidden="true" />
            )}
            <button
              type="button"
              className="deck-time"
              onClick={() => setShowRemaining((v) => !v)}
              aria-label={showRemaining ? "Show elapsed time" : "Show remaining time"}
              title={showRemaining ? "Remaining" : "Elapsed"}
            >
              {showRemaining && duration
                ? `-${fmt(Math.max(0, duration - time))}`
                : fmt(time)}
            </button>
            <Spectrum colors={spectrum} />
            <div className="deck-marquee" aria-live="polite">
              <span className={`deck-marquee-text${marqueeRuns ? " run" : ""}`}>
                {displayMarquee}
                <span aria-hidden="true" className="deck-marquee-gap">
                  {"      ◈      "}
                </span>
                {marqueeRuns ? displayMarquee : ""}
              </span>
            </div>
          </div>

          {/* control row: transport · seek · volume */}
          <div className="deck-ctrl">
            <button
              type="button"
              className="deck-key"
              onClick={prev}
              aria-label="Previous track"
            >
              ⏮
            </button>
            <button
              type="button"
              className={`deck-key deck-key-play${playing && !reduced ? " is-pulsing" : ""}`}
              style={
                playing && bpm
                  ? ({ "--beat": `${(60 / bpm).toFixed(3)}s` } as CSSProperties)
                  : undefined
              }
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? "⏸" : "▶"}
            </button>
            <button
              type="button"
              className="deck-key"
              onClick={next}
              aria-label="Next track"
            >
              ⏭
            </button>
            <input
              className="deck-seek"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(time, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek"
            />
            <input
              className="deck-vol"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              title="Volume"
            />
          </div>

          {/* equalizer drawer */}
          {eqOpen && (
            <div className="deck-eq-panel">
              <div className="deck-eq-presets">
                {Object.keys(EQ_PRESETS).map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`deck-eq-preset${eqPreset === name ? " is-active" : ""}`}
                    aria-pressed={eqPreset === name}
                    onClick={() => {
                      const gains = EQ_PRESETS[name];
                      setEqGains(gains);
                      setEqPreset(name);
                      persist({ eq: gains, eqPreset: name });
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="deck-eq-bands">
                {EQ_BANDS.map((hz, i) => (
                  <div key={hz} className="deck-eq-band">
                    <span className="deck-eq-slot">
                      <input
                        className="deck-eq-slider"
                        type="range"
                        min={-12}
                        max={12}
                        step={1}
                        value={eqGains[i] ?? 0}
                        onChange={(e) => {
                          const db = Number(e.target.value);
                          setEqGain(i, db);
                          const next = eqGains.slice();
                          next[i] = db;
                          // Hand-tweaking a band clears the active preset.
                          setEqPreset(null);
                          persist({ eq: next, eqPreset: null });
                        }}
                        aria-label={`${eqBandLabel(hz)} Hz, ${eqGains[i] ?? 0} decibels`}
                      />
                    </span>
                    <span className="deck-eq-hz" aria-hidden="true">
                      {eqBandLabel(hz)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* playlist drawer */}
          {listOpen && (
            <div className="deck-list">
              <p className="deck-list-head">
                {playableCount}/{allTracks.length} recorded
              </p>
              <ol className="deck-list-rows">
                {allTracks.map((t) => {
                  const isCur = t.id === currentId;
                  const can = Boolean(t.audioUrl);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`deck-row${isCur ? " cur" : ""}${can ? "" : " off"}`}
                        onClick={() => can && playTrack(t.id)}
                        disabled={!can}
                        aria-current={isCur || undefined}
                      >
                        {t.coverImage ? (
                          <img className="deck-row-cover" src={t.coverImage} alt="" />
                        ) : (
                          <span
                            className="deck-row-cover deck-row-cover-empty"
                            aria-hidden="true"
                          />
                        )}
                        <span className="deck-row-num">
                          {String(t.number).padStart(2, "0")}
                        </span>
                        <span className="deck-row-title">{t.title}</span>
                        <span className="deck-row-person">{t.person}</span>
                        <span className="deck-row-tag">
                          {isCur && playing ? (
                            <span className="deck-eq" aria-hidden="true">
                              <i /><i /><i />
                            </span>
                          ) : can ? (
                            "▸"
                          ) : (
                            "·"
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {vizOpen && canViz && (
            <Visualizer onClose={() => setVizOpen(false)} />
          )}
        </div>
      )}
      </motion.section>
    </>
  );
}
