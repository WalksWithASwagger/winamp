import { SKIN_SPRITES, type SpriteName } from "./skinSprites";

export type SkinColors = {
  /** 24 visualizer colors as CSS `rgb(...)` strings (from viscolor.txt). */
  viscolor: string[];
  /** Playlist editor colors (from pledit.txt). */
  playlistNormal?: string;
  playlistCurrent?: string;
  playlistNormalBackground?: string;
  playlistSelectedBackground?: string;
};

export type Skin = {
  /** Sprite name → data-URI of the cropped image. */
  sprites: Partial<Record<SpriteName, string>>;
  colors: SkinColors;
};

// Winamp's built-in viscolor fallback (used when a skin omits viscolor.txt).
const DEFAULT_VISCOLOR: string[] = [
  "rgb(0,0,0)", "rgb(24,33,41)", "rgb(239,49,16)", "rgb(206,41,16)",
  "rgb(214,90,0)", "rgb(214,102,0)", "rgb(214,115,0)", "rgb(198,123,8)",
  "rgb(222,165,24)", "rgb(214,181,33)", "rgb(189,222,41)", "rgb(148,222,33)",
  "rgb(41,206,16)", "rgb(50,190,16)", "rgb(57,181,16)", "rgb(49,156,8)",
  "rgb(41,148,0)", "rgb(24,132,8)", "rgb(255,255,255)", "rgb(214,214,222)",
  "rgb(181,189,189)", "rgb(160,170,175)", "rgb(148,156,165)", "rgb(150,150,150)",
];

/** Parse viscolor.txt — 24 lines of `r,g,b` (trailing `// comment` allowed). */
export function parseViscolor(text: string): string[] {
  const colors = text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/))
    .filter((m): m is RegExpMatchArray => m != null)
    .map((m) => `rgb(${m[1]},${m[2]},${m[3]})`);
  // Pad/truncate to exactly 24 using the default for any missing entries.
  return Array.from({ length: 24 }, (_, i) => colors[i] ?? DEFAULT_VISCOLOR[i]);
}

/** Parse the `[Text]` color keys out of pledit.txt. */
export function parsePledit(text: string): Partial<SkinColors> {
  const get = (key: string): string | undefined => {
    const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(#?[0-9a-fA-F]{6})`, "im"));
    if (!m) return undefined;
    return m[1].startsWith("#") ? m[1] : `#${m[1]}`;
  };
  return {
    playlistNormal: get("Normal"),
    playlistCurrent: get("Current"),
    playlistNormalBackground: get("NormalBG"),
    playlistSelectedBackground: get("SelectedBG"),
  };
}

function cropSprite(
  bitmap: ImageBitmap,
  s: { x: number; y: number; width: number; height: number },
): string {
  const canvas = document.createElement("canvas");
  canvas.width = s.width;
  canvas.height = s.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("classic-skin: no 2d canvas context");
  ctx.drawImage(bitmap, s.x, s.y, s.width, s.height, 0, 0, s.width, s.height);
  return canvas.toDataURL();
}

/**
 * Parse a `.wsz` ArrayBuffer into a {@link Skin}: unzip, decode each BMP the
 * browser supports natively, crop every known sprite to a data-URI, and read
 * the color config. `fflate` is dynamic-imported so consumers of the modern
 * deck never pull it into their bundle.
 */
export async function parseSkin(buf: ArrayBuffer): Promise<Skin> {
  const { unzipSync } = await import("fflate");
  const files = unzipSync(new Uint8Array(buf));

  // Skins vary in path/case; index by lowercased basename.
  const byName = new Map<string, Uint8Array>();
  for (const [path, data] of Object.entries(files)) {
    byName.set(path.split("/").pop()!.toLowerCase(), data);
  }

  const sprites: Partial<Record<SpriteName, string>> = {};
  for (const [bmp, defs] of Object.entries(SKIN_SPRITES)) {
    const data = byName.get(`${bmp.toLowerCase()}.bmp`);
    if (!data) continue;
    // Copy into a fresh Uint8Array so the Blob part is ArrayBuffer-backed.
    const bitmap = await createImageBitmap(
      new Blob([new Uint8Array(data)], { type: "image/bmp" }),
    );
    for (const def of defs) sprites[def.name] = cropSprite(bitmap, def);
    bitmap.close?.();
  }

  const decode = (name: string): string | undefined => {
    const data = byName.get(name);
    return data ? new TextDecoder().decode(data) : undefined;
  };
  const viscolorText = decode("viscolor.txt");
  const pleditText = decode("pledit.txt");

  return {
    sprites,
    colors: {
      viscolor: viscolorText ? parseViscolor(viscolorText) : DEFAULT_VISCOLOR,
      ...(pleditText ? parsePledit(pleditText) : {}),
    },
  };
}
