"use client";

import { useEffect, useRef } from "react";
import { useSkinContext } from "./SkinContext";

const VIZ_W = 76;
const VIZ_H = 16;
const BARS = 19;

/**
 * The classic spectrum analyzer, drawn from the player's AnalyserNode and
 * colored with the skin's viscolor palette (index 0 = background, 2..17 = the
 * bottom-to-top spectrum gradient). Idle when there's no analyser yet.
 */
export function ClassicVisualizer({
  analyser,
  left = 24,
  top = 43,
}: {
  analyser: AnalyserNode | null;
  left?: number;
  top?: number;
}) {
  const skin = useSkinContext();
  const ref = useRef<HTMLCanvasElement>(null);
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
          const v = data[Math.floor((i / BARS) * data.length * 0.7)] / 255;
          const h = Math.round(v * VIZ_H);
          for (let y = 0; y < h; y++) {
            ctx.fillStyle = colors[2 + Math.floor((y / VIZ_H) * 16)] ?? "#0c0";
            ctx.fillRect(Math.floor(i * barW), VIZ_H - 1 - y, Math.ceil(barW) - 1 || 1, 1);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser, viscolor]);

  return (
    <canvas
      ref={ref}
      width={VIZ_W}
      height={VIZ_H}
      style={{ position: "absolute", left, top, width: VIZ_W, height: VIZ_H, imageRendering: "pixelated" }}
    />
  );
}
