"use client";

/* eslint-disable @next/next/no-img-element -- local PNG album art, not remote */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, type MotionStyle } from "framer-motion";
import { usePlayer } from "./PlayerProvider";
import { Visualizer } from "./Visualizer";
import { THEMES, type DeckTheme } from "./themes";
import { usePlayerKeyboardShortcuts } from "./usePlayerKeyboardShortcuts";
import { EqualizerPanel } from "./modernDeck/EqualizerPanel";
import { PlaylistPanel } from "./modernDeck/PlaylistPanel";
import { DeckDisplay, TransportControls } from "./modernDeck/Transport";
import { useDeckWindowState } from "./modernDeck/useDeckWindowState";

const DEFAULT_SPECTRUM_COLORS = ["#f47a52", "#fcd117", "#6dcad0", "#9b7bff", "#eaa8cb"];

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
  const markSrc = wordmarkSrc ?? themePack?.markSrc;
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
  const [listOpen, setListOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [vizOpen, setVizOpen] = useState(false);
  const [easter, setEaster] = useState(false);
  const deckId = useId();
  const eqPanelId = `${deckId}-eq`;
  const playlistId = `${deckId}-playlist`;
  const {
    canViz,
    deckRef,
    doubled,
    dragControls,
    isMobile,
    onBarDoubleClick,
    persist,
    reduced,
    shaded,
    setShaded,
    startDrag,
    toggleDoubleSize,
    boundsRef,
    x,
    y,
    eqPreset,
    setEqPreset,
  } = useDeckWindowState({ storageKey, setEqGains });

  usePlayerKeyboardShortcuts();

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

  const current = currentId
    ? allTracks.find((track) => track.id === currentId) ?? null
    : null;
  const numLabel = current ? String(current.number).padStart(2, "0") : "--";
  const marquee = current
    ? `${numLabel}·${current.title.toUpperCase()}  ·  ${current.person.toUpperCase()}${bpm ? `  ·  ${bpm} BPM` : ""}`
    : "ETHọ́S BLOCK PARTY  ·  SELECT A TRACK";
  const displayMarquee = easter
    ? "♪  IT REALLY WHIPS THE LLAMA'S ASS  ♪  🦙"
    : marquee;
  const marqueeRuns = (playing || easter) && !reduced;

  return (
    <>
      <div ref={boundsRef} className="deck-bounds" aria-hidden="true" />
      <motion.section
        ref={deckRef}
        className={`deck${shaded ? " is-shaded" : ""}`}
        role="region"
        aria-label={`Block Party player${theme ? `, ${theme} skin` : ""}`}
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
            "--deck-accent":
              current?.art.palette[0] ?? themePack?.vars["--deck-accent"] ?? "#f47a52",
          } as MotionStyle
        }
      >
        <div
          className="deck-bar"
          onPointerDown={startDrag}
          onDoubleClick={onBarDoubleClick}
        >
          {markSrc && (
            <img
              className="deck-mark-img"
              src={markSrc}
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
                aria-expanded={vizOpen}
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
              aria-expanded={eqOpen}
              aria-controls={eqPanelId}
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
              aria-expanded={listOpen}
              aria-controls={playlistId}
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
                aria-expanded={doubled}
                aria-label="Double size"
                title="Double size"
                onClick={toggleDoubleSize}
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
              aria-pressed={shaded}
              aria-expanded={!shaded}
              onClick={() => setShaded((v) => !v)}
            >
              {shaded ? "▣" : "_"}
            </button>
          </div>
        </div>

        {!shaded && (
          <div className="deck-body">
            <DeckDisplay
              current={current}
              duration={duration}
              displayMarquee={displayMarquee}
              marqueeRuns={marqueeRuns}
              onToggleTime={() => setShowRemaining((v) => !v)}
              showRemaining={showRemaining}
              spectrumColors={spectrum}
              time={time}
            />

            <TransportControls
              bpm={bpm}
              duration={duration}
              onNext={next}
              onPrevious={prev}
              onSeek={seek}
              onToggle={toggle}
              onVolume={setVolume}
              playing={playing}
              reduced={reduced}
              time={time}
              volume={volume}
            />

            {eqOpen && (
              <EqualizerPanel
                id={eqPanelId}
                eqGains={eqGains}
                eqPreset={eqPreset}
                persist={persist}
                setEqGain={setEqGain}
                setEqGains={setEqGains}
                setEqPreset={setEqPreset}
              />
            )}

            {listOpen && (
              <PlaylistPanel
                id={playlistId}
                allTracks={allTracks}
                currentId={currentId}
                playing={playing}
                playTrack={playTrack}
              />
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
