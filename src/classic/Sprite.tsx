"use client";

import { type CSSProperties, useState } from "react";
import { SPRITE_DIMS, type SpriteName } from "./skinSprites";
import { useSkinContext } from "./SkinContext";

const base = (name: SpriteName, uri?: string): CSSProperties => ({
  width: SPRITE_DIMS[name]?.width,
  height: SPRITE_DIMS[name]?.height,
  backgroundImage: uri ? `url(${uri})` : undefined,
  backgroundRepeat: "no-repeat",
  imageRendering: "pixelated",
});

/** A single skin sprite rendered at its native pixel size. */
export function Sprite({
  name,
  style,
}: {
  name: SpriteName;
  style?: CSSProperties;
}) {
  const skin = useSkinContext();
  return <div style={{ ...base(name, skin?.sprites[name]), ...style }} />;
}

/**
 * A button that shows its `up` sprite normally and `down` while pressed.
 * Sized from the `up` sprite.
 */
export function SpriteButton({
  up,
  down,
  onClick,
  title,
  style,
}: {
  up: SpriteName;
  down: SpriteName;
  onClick?: () => void;
  title?: string;
  style?: CSSProperties;
}) {
  const skin = useSkinContext();
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        ...base(up, skin?.sprites[pressed ? down : up]),
        padding: 0,
        border: "none",
        backgroundColor: "transparent",
        cursor: "pointer",
        ...style,
      }}
    />
  );
}
