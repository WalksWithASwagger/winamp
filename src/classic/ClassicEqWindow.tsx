"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { EQ_BANDS, EQ_MAX_DB, usePlayer } from "../PlayerProvider";
import { useSkin } from "./useSkin";
import { SkinProvider, useSkinContext } from "./SkinContext";
import { Sprite, SpriteButton } from "./Sprite";
import { Slider } from "./Slider";

const W = 275;
const H = 116;
const BAND_TOP = 38;
const BAND_TRACK_H = 63;
const BAND_X0 = 78;
const BAND_STEP = 18;

const placed = (left: number, top: number): CSSProperties => ({
  position: "absolute",
  left,
  top,
});

const gainToValue = (db: number) => (db + EQ_MAX_DB) / (2 * EQ_MAX_DB);
const valueToGain = (v: number) => v * 2 * EQ_MAX_DB - EQ_MAX_DB;

/** Canvas EQ curve drawn from the preamp + band gains. */
function EqGraph({ gains, preamp }: { gains: number[]; preamp: number }) {
  const skin = useSkinContext();
  const ref = useRef<HTMLCanvasElement>(null);
  const line = skin?.colors.viscolor?.[18] ?? "#00ff00";
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 113, 19);
    const y = (db: number) => 9.5 - (db / EQ_MAX_DB) * 9;
    ctx.strokeStyle = line;
    ctx.beginPath();
    gains.forEach((g, i) => {
      const x = (i / (gains.length - 1)) * 113;
      const yy = y(g + preamp / 2);
      i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    });
    ctx.stroke();
  }, [gains, preamp, line]);
  return (
    <canvas
      ref={ref}
      width={113}
      height={19}
      style={{ ...placed(86, 17), width: 113, height: 19, imageRendering: "pixelated" }}
    />
  );
}

/**
 * Classic Winamp equalizer window from a `.wsz` skin, driven by the surrounding
 * {@link PlayerProvider}. The 10 band sliders map 1:1 to the engine's EQ_BANDS;
 * preamp and the on/off toggle use the additive engine controls. Render inside a
 * `<PlayerProvider>`, with the same `skinUrl` as the main window.
 */
export function ClassicEqWindow({
  skinUrl,
  scale = 1,
}: {
  skinUrl: string;
  scale?: number;
}) {
  const { skin, status } = useSkin(skinUrl);
  const { eqGains, eqEnabled, preamp, setEqGain, setEqEnabled, setPreamp } =
    usePlayer();

  return (
    <SkinProvider skin={skin}>
      <div data-eq-status={status} style={{ width: W * scale, height: H * scale }}>
        <div
          style={{
            position: "relative",
            width: W,
            height: H,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: "top left",
            imageRendering: "pixelated",
          }}
        >
          <Sprite name="EQ_WINDOW_BACKGROUND" style={placed(0, 0)} />
          <Sprite name="EQ_TITLE_BAR_SELECTED" style={placed(0, 0)} />
          <SpriteButton
            up={eqEnabled ? "EQ_ON_BUTTON_SELECTED" : "EQ_ON_BUTTON"}
            down={eqEnabled ? "EQ_ON_BUTTON" : "EQ_ON_BUTTON_SELECTED"}
            onClick={() => setEqEnabled(!eqEnabled)}
            title={eqEnabled ? "EQ on" : "EQ off"}
            style={placed(14, 18)}
          />
          <Sprite name="EQ_AUTO_BUTTON" style={placed(40, 18)} />
          <Sprite name="EQ_PRESETS_BUTTON" style={placed(217, 18)} />

          <EqGraph gains={eqGains} preamp={preamp} />

          <Slider
            thumb="EQ_SLIDER_THUMB"
            thumbActive="EQ_SLIDER_THUMB_SELECTED"
            value={gainToValue(preamp)}
            onChange={(v) => setPreamp(valueToGain(v))}
            trackWidth={11}
            trackHeight={BAND_TRACK_H}
            vertical
            style={placed(21, BAND_TOP)}
          />
          {EQ_BANDS.map((_, i) => (
            <Slider
              key={i}
              thumb="EQ_SLIDER_THUMB"
              thumbActive="EQ_SLIDER_THUMB_SELECTED"
              value={gainToValue(eqGains[i])}
              onChange={(v) => setEqGain(i, valueToGain(v))}
              trackWidth={11}
              trackHeight={BAND_TRACK_H}
              vertical
              style={placed(BAND_X0 + i * BAND_STEP, BAND_TOP)}
            />
          ))}
        </div>
      </div>
    </SkinProvider>
  );
}
