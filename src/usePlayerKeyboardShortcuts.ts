"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "./PlayerProvider";

export type KeyboardShortcutOptions = {
  /** Disable all shortcuts (default true). */
  enabled?: boolean;
  /** Seconds the arrow keys seek by (default 5). */
  seekStep?: number;
  /** Volume fraction the arrow keys change by (default 0.05). */
  volumeStep?: number;
};

/**
 * Global media keyboard shortcuts for the player, driven by `usePlayer()`:
 * Space = play/pause, ←/→ = seek ±`seekStep`s, ↑/↓ = volume ±`volumeStep`.
 * Ignored while a form field / button is focused. Must be used inside a
 * `<PlayerProvider>`. `WinampPlayer` attaches this automatically; consumers
 * using a custom UI can attach it themselves.
 */
export function usePlayerKeyboardShortcuts(options: KeyboardShortcutOptions = {}) {
  const { enabled = true, seekStep = 5, volumeStep = 0.05 } = options;
  const { toggle, currentId, time, duration, volume, seek, setVolume } = usePlayer();

  // Read live state from a ref so the listener binds once (not on every tick).
  const live = useRef({ currentId, time, duration, volume });
  live.current = { currentId, time, duration, volume };

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "BUTTON" ||
          t.isContentEditable)
      )
        return;
      const { currentId, time, duration, volume } = live.current;
      switch (e.code) {
        case "Space":
          if (!currentId) return; // nothing loaded — let space scroll the page
          e.preventDefault();
          toggle();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(Math.max(0, time - seekStep));
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(duration ? Math.min(duration, time + seekStep) : time + seekStep);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, volume + volumeStep));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, volume - volumeStep));
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, seekStep, volumeStep, toggle, seek, setVolume]);
}
