"use client";

import type { CSSProperties } from "react";
import type { PlayerTrack } from "../types";
import { Spectrum } from "./Spectrum";

export function formatDeckTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function DeckDisplay({
  current,
  duration,
  marqueeRuns,
  onToggleTime,
  showRemaining,
  spectrumColors,
  time,
  displayMarquee,
}: {
  current: PlayerTrack | null;
  duration: number;
  marqueeRuns: boolean;
  onToggleTime: () => void;
  showRemaining: boolean;
  spectrumColors: string[];
  time: number;
  displayMarquee: string;
}) {
  return (
    <div className="deck-lcd">
      {current?.coverImage ? (
        <img className="deck-cover" src={current.coverImage} alt="" />
      ) : (
        <span className="deck-cover deck-cover-empty" aria-hidden="true" />
      )}
      <button
        type="button"
        className="deck-time"
        onClick={onToggleTime}
        aria-label={showRemaining ? "Show elapsed time" : "Show remaining time"}
        aria-pressed={showRemaining}
        title={showRemaining ? "Remaining" : "Elapsed"}
      >
        {showRemaining && duration
          ? `-${formatDeckTime(Math.max(0, duration - time))}`
          : formatDeckTime(time)}
      </button>
      <Spectrum colors={spectrumColors} />
      <div className="deck-marquee" role="status" aria-live="polite" aria-atomic="true">
        <span className={`deck-marquee-text${marqueeRuns ? " run" : ""}`}>
          {displayMarquee}
          <span aria-hidden="true" className="deck-marquee-gap">
            {"      ◈      "}
          </span>
          {marqueeRuns ? <span aria-hidden="true">{displayMarquee}</span> : ""}
        </span>
      </div>
    </div>
  );
}

export function TransportControls({
  bpm,
  duration,
  onNext,
  onPrevious,
  onSeek,
  onToggle,
  onVolume,
  playing,
  reduced,
  time,
  volume,
}: {
  bpm: number | null;
  duration: number;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onToggle: () => void;
  onVolume: (volume: number) => void;
  playing: boolean;
  reduced: boolean;
  time: number;
  volume: number;
}) {
  return (
    <div className="deck-ctrl">
      <button type="button" className="deck-key" onClick={onPrevious} aria-label="Previous track">
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
        onClick={onToggle}
        aria-label={playing ? "Pause" : "Play"}
        aria-pressed={playing}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <button type="button" className="deck-key" onClick={onNext} aria-label="Next track">
        ⏭
      </button>
      <input
        className="deck-seek"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(time, duration || 0)}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Seek"
        aria-valuetext={`${formatDeckTime(time)} of ${formatDeckTime(duration)}`}
      />
      <input
        className="deck-vol"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onVolume(Number(e.target.value))}
        aria-label="Volume"
        aria-valuetext={`${Math.round(volume * 100)}%`}
        title="Volume"
      />
    </div>
  );
}
