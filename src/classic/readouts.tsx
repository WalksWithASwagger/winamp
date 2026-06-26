"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";
import { FONT_CHAR_WIDTH, glyphFor } from "./font";
import { Sprite } from "./Sprite";

// Digit positions within the main window (time area at left 39; per-digit
// offsets from webamp css/main-window.css). Minute leading digit is blank
// under 10 minutes, matching Winamp.
const DIGIT_LEFT = [48, 60, 78, 90];
const DIGIT_TOP = 26;

/** Elapsed time as four NUMBERS sprite digits (m m : s s). */
export function TimeDisplay({ seconds }: { seconds: number }) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.min(99, Math.floor(s / 60));
  const ss = s % 60;
  const digits: Array<number | null> = [
    mm >= 10 ? Math.floor(mm / 10) : null,
    mm % 10,
    Math.floor(ss / 10),
    ss % 10,
  ];
  return (
    <>
      {digits.map((d, i) =>
        d === null ? null : (
          <Sprite
            key={i}
            name={`DIGIT_${d}`}
            style={{ position: "absolute", left: DIGIT_LEFT[i], top: DIGIT_TOP }}
          />
        ),
      )}
    </>
  );
}

/** A string drawn in the skin's 5×6 bitmap font. */
export function BitmapText({ text }: { text: string }) {
  return (
    <div style={{ display: "flex" }}>
      {[...text].map((ch, i) => {
        const name = glyphFor(ch) ?? glyphFor(" ")!;
        return <Sprite key={i} name={name} />;
      })}
    </div>
  );
}

/**
 * Scrolling song-title marquee in the skin's bitmap font. Scrolls only when the
 * text overflows the track, and not at all under prefers-reduced-motion.
 */
export function Marquee({
  text,
  width = 154,
  left = 111,
  top = 24,
}: {
  text: string;
  width?: number;
  left?: number;
  top?: number;
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
    let last: number | null = null;
    const loop = (t: number) => {
      if (last == null) last = t;
      const dt = t - last;
      last = t;
      setOffset((o) => (o > textWidth + 10 ? -width : o + dt * 0.02));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scrolls, textWidth, width]);

  return (
    <div
      style={{ position: "absolute", left, top, width, height: 6, overflow: "hidden" }}
    >
      <div style={{ position: "absolute", left: -Math.round(offset) }}>
        <BitmapText text={text} />
      </div>
    </div>
  );
}
