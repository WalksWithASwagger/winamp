"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "../PlayerProvider";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";

export function Spectrum({ colors }: { colors: string[] }) {
  const { analyser, playing } = usePlayer();
  const reduced = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
        ctx.fillStyle = colors[i % colors.length];
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

  return (
    <canvas
      ref={canvasRef}
      width={58}
      height={16}
      className="deck-spectrum"
      aria-hidden="true"
    />
  );
}
