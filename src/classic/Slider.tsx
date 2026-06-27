"use client";

import { type CSSProperties, type PointerEvent, useRef, useState } from "react";
import { SPRITE_DIMS, type SpriteName } from "./skinSprites";
import { useSkinContext } from "./SkinContext";

/**
 * A skin slider: a track sprite with a draggable thumb. `value` is 0..1 and
 * `onChange` fires with the new fraction during drag.
 *
 * Some Winamp track sprites (e.g. VOLUME) are a vertical strip of `frames`
 * level-variants; pass `frames`/`frameHeight` to window into the right one for
 * the current value. Single-frame tracks (e.g. POSBAR) omit them.
 */
export function Slider({
  background,
  thumb,
  thumbActive,
  value,
  onChange,
  trackWidth,
  trackHeight,
  frames,
  frameHeight,
  vertical = false,
  style,
}: {
  background?: SpriteName;
  thumb: SpriteName;
  thumbActive?: SpriteName;
  value: number;
  onChange?: (value: number) => void;
  trackWidth: number;
  trackHeight: number;
  frames?: number;
  frameHeight?: number;
  /** Vertical slider (value 1 = top), e.g. EQ bands. */
  vertical?: boolean;
  style?: CSSProperties;
}) {
  const skin = useSkinContext();
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const v = Math.min(1, Math.max(0, value));
  const bgUri = background ? skin?.sprites[background] : undefined;
  const thumbUri = skin?.sprites[dragging && thumbActive ? thumbActive : thumb];
  const thumbW = SPRITE_DIMS[thumb]?.width ?? 0;
  const thumbH = SPRITE_DIMS[thumb]?.height ?? 0;

  // Window into the correct level-frame for multi-frame tracks (e.g. volume).
  const frameY =
    frames && frameHeight ? Math.round(v * (frames - 1)) * frameHeight : 0;

  const emit = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el || !onChange) return;
    const rect = el.getBoundingClientRect();
    const frac = vertical
      ? 1 - (clientY - rect.top) / rect.height
      : (clientX - rect.left) / rect.width;
    onChange(Math.min(1, Math.max(0, frac)));
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    // Capture so the drag keeps tracking outside the track; ignore if the
    // environment can't capture this pointer.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op
    }
    emit(e.clientX, e.clientY);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) emit(e.clientX, e.clientY);
  };
  const stop = () => setDragging(false);

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      style={{
        position: "absolute",
        width: trackWidth,
        height: trackHeight,
        backgroundImage: bgUri ? `url(${bgUri})` : undefined,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `0 -${frameY}px`,
        imageRendering: "pixelated",
        touchAction: "none",
        cursor: "pointer",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: vertical ? (trackWidth - thumbW) / 2 : v * (trackWidth - thumbW),
          top: vertical ? (1 - v) * (trackHeight - thumbH) : (trackHeight - thumbH) / 2,
          width: thumbW,
          height: thumbH,
          backgroundImage: thumbUri ? `url(${thumbUri})` : undefined,
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
