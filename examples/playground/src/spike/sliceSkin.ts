// Ph0 spike (throwaway): prove the .wsz pipeline end-to-end —
// unzip → decode native BMP → crop sprites via off-DOM canvas → data URI.
// The real, reusable version lands in src/classic/ in Ph1.

// CBUTTONS.bmp sprite layout (classic Winamp geometry, ported from webamp/MIT):
// transport buttons, 23×18 each, "up" row at y=0, "pressed" row at y=18.
const CBUTTONS = {
  prevUp: [0, 0, 23, 18],
  prevDown: [0, 18, 23, 18],
  playUp: [23, 0, 23, 18],
  playDown: [23, 18, 23, 18],
  nextUp: [92, 0, 22, 18],
  nextDown: [92, 18, 22, 18],
} as const;

export type SpriteSet = Record<keyof typeof CBUTTONS, string>;

export async function sliceSkin(buf: ArrayBuffer): Promise<SpriteSet> {
  // fflate is dynamic-imported, mirroring how the real engine will keep it out
  // of the modern-deck bundle.
  const { unzipSync } = await import("fflate");
  const files = unzipSync(new Uint8Array(buf));

  // Skins vary in filename case; match insensitively.
  const key = Object.keys(files).find((k) => /(^|\/)cbuttons\.bmp$/i.test(k));
  if (!key) throw new Error("CBUTTONS.bmp not found in skin");

  // Browsers decode BMP natively, so let createImageBitmap do the work.
  const bitmap = await createImageBitmap(new Blob([files[key]], { type: "image/bmp" }));

  const slice = ([x, y, w, h]: readonly number[]): string => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, x, y, w, h, 0, 0, w, h);
    return canvas.toDataURL();
  };

  return Object.fromEntries(
    Object.entries(CBUTTONS).map(([name, rect]) => [name, slice(rect)]),
  ) as SpriteSet;
}
