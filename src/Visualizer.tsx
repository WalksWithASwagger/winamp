"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayer } from "./PlayerProvider";

type Viz = {
  connectAudio: (node: AudioNode) => void;
  loadPreset: (preset: unknown, blend: number) => void;
  setRendererSize: (w: number, h: number) => void;
  render: () => void;
};

type Status = "loading" | "ready" | "unsupported";

export function Visualizer({ onClose }: { onClose: () => void }) {
  const { analyser } = usePlayer();
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vizRef = useRef<Viz | null>(null);
  const presetsRef = useRef<Record<string, unknown>>({});
  const keysRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const [status, setStatus] = useState<Status>("loading");
  const [presetName, setPresetName] = useState("");

  // Size the canvas backing store to the panel at the current DPR.
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
    if (!analyser) return; // nothing has played yet; render shows "press play"
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let raf = 0;
    let cycle: ReturnType<typeof setInterval> | undefined;

    (async () => {
      try {
        const [bMod, pMod] = await Promise.all([
          import("butterchurn"),
          import("butterchurn-presets/lib/butterchurnPresetsMinimal.min.js"),
        ]);
        if (cancelled) return;
        const butterchurn = (bMod as { default?: unknown }).default ?? bMod;
        const presetsLib = (pMod as { default?: unknown }).default ?? pMod;
        const presets = (presetsLib as { getPresets: () => Record<string, unknown> }).getPresets();
        const keys = Object.keys(presets);
        if (!keys.length) throw new Error("no presets");

        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
        const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
        canvas.width = w;
        canvas.height = h;

        const viz = (
          butterchurn as {
            createVisualizer: (ctx: BaseAudioContext, c: HTMLCanvasElement, o: object) => Viz;
          }
        ).createVisualizer(analyser.context, canvas, {
          width: w,
          height: h,
          pixelRatio: 1,
          textureRatio: 1,
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
        }, 16000);

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

    // Keep the renderer matched to the canvas's actual size — covers window
    // resize, the deck widening when VIZ opens, and entering/exiting fullscreen.
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

  return (
    <div className="deck-viz" ref={panelRef}>
      <canvas ref={canvasRef} className="deck-viz-canvas" aria-hidden="true" />
      <div className="deck-viz-bar">
        <span className="deck-viz-label" title={presetName || "milkdrop"}>
          {status === "ready" && presetName ? presetName : "milkdrop"}
        </span>
        <span className="deck-bar-fill" aria-hidden="true" />
        <button type="button" className="deck-winbtn" aria-label="Next preset" onClick={nextPreset}>
          ↻
        </button>
        <button
          type="button"
          className="deck-winbtn"
          aria-label="Fullscreen visualizer"
          onClick={toggleFullscreen}
        >
          ⛶
        </button>
        <button type="button" className="deck-winbtn" aria-label="Close visualizer" onClick={onClose}>
          ✕
        </button>
      </div>
      {(!analyser || status !== "ready") && (
        <p className="deck-viz-msg">
          {!analyser
            ? "press play to see it move"
            : status === "unsupported"
              ? "visualizer needs WebGL2"
              : "loading milkdrop…"}
        </p>
      )}
    </div>
  );
}
