import { afterEach, describe, expect, it, vi } from "vitest";
import { zipSync } from "fflate";
import {
  parseSkin,
  parsePledit,
  parseViscolor,
  SKIN_SPRITES,
  SPRITE_DIMS,
} from "../src";

const MIB = 1024 * 1024;
const MAX_COMPRESSED_SKIN_BYTES = 8 * MIB;
const MAX_SKIN_ENTRIES = 128;
const MAX_SKIN_ENTRY_BYTES = 8 * MIB;
const MAX_EXPANDED_SKIN_BYTES = 32 * MIB;

afterEach(() => {
  vi.unstubAllGlobals();
});

function archive(files: Record<string, Uint8Array>): ArrayBuffer {
  return zipSync(files).slice().buffer;
}

function archiveWithBitmap(files: Record<string, Uint8Array>): ArrayBuffer {
  return archive({ "MAIN.BMP": Uint8Array.of(0), ...files });
}

function exactStoredArchiveSize(): Uint8Array {
  const empty = zipSync({
    "padding.bin": [new Uint8Array(0), { level: 0 }],
  });
  const result = zipSync({
    "padding.bin": [
      new Uint8Array(MAX_COMPRESSED_SKIN_BYTES - empty.byteLength),
      { level: 0 },
    ],
  });
  if (result.byteLength !== MAX_COMPRESSED_SKIN_BYTES) {
    throw new Error("test archive did not reach the compressed-size boundary");
  }
  return result;
}

function bitmapDecodeGuard() {
  const decode = vi.fn(() => {
    throw new Error("bitmap decoding should not run");
  });
  vi.stubGlobal("createImageBitmap", decode);
  return decode;
}

describe("sprite coordinate table", () => {
  it("defines the classic main window and transport sprites at known sizes", () => {
    expect(SKIN_SPRITES.MAIN[0]).toMatchObject({
      name: "MAIN_WINDOW_BACKGROUND",
      width: 275,
      height: 116,
    });
    expect(SPRITE_DIMS.MAIN_PLAY_BUTTON).toEqual({ width: 23, height: 18 });
    expect(SPRITE_DIMS.MAIN_PLAY_BUTTON_ACTIVE).toEqual({ width: 23, height: 18 });
    expect(SPRITE_DIMS.DIGIT_0).toEqual({ width: 9, height: 13 });
  });

  it("derives SPRITE_DIMS for every sprite in the table", () => {
    const all = Object.values(SKIN_SPRITES).flat();
    for (const s of all) {
      expect(SPRITE_DIMS[s.name]).toEqual({ width: s.width, height: s.height });
    }
  });
});

describe("parseViscolor", () => {
  it("parses r,g,b lines into rgb() strings and pads to 24", () => {
    const text = "255,0,0 // red\n0,255,0\n0,0,255";
    const colors = parseViscolor(text);
    expect(colors).toHaveLength(24);
    expect(colors[0]).toBe("rgb(255,0,0)");
    expect(colors[1]).toBe("rgb(0,255,0)");
    expect(colors[2]).toBe("rgb(0,0,255)");
    // Missing entries fall back to the default palette (a valid rgb string).
    expect(colors[23]).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });
});

describe("parsePledit", () => {
  it("reads playlist colors with or without a leading #", () => {
    const text = "[Text]\nNormal=#00FF00\nCurrent=FFFFFF\nNormalBG=#000000\nSelectedBG=0000FF\n";
    expect(parsePledit(text)).toEqual({
      playlistNormal: "#00FF00",
      playlistCurrent: "#FFFFFF",
      playlistNormalBackground: "#000000",
      playlistSelectedBackground: "#0000FF",
    });
  });

  it("returns undefined for absent keys", () => {
    expect(parsePledit("[Text]\n")).toEqual({
      playlistNormal: undefined,
      playlistCurrent: undefined,
      playlistNormalBackground: undefined,
      playlistSelectedBackground: undefined,
    });
  });
});

describe("parseSkin archive bounds", () => {
  it("rejects compressed archives larger than 8 MiB before bitmap decoding", async () => {
    const exact = exactStoredArchiveSize();
    const oversized = new Uint8Array(exact.byteLength + 1);
    oversized.set(exact);
    const decode = bitmapDecodeGuard();

    await expect(parseSkin(oversized.slice().buffer)).rejects.toThrow(
      "classic-skin: compressed size exceeds 8 MiB",
    );
    expect(decode).not.toHaveBeenCalled();
  });

  it("rejects archives with more than 128 entries before bitmap decoding", async () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < MAX_SKIN_ENTRIES; i += 1) {
      files[`entry-${i}.txt`] = Uint8Array.of(0);
    }
    const decode = bitmapDecodeGuard();

    await expect(parseSkin(archiveWithBitmap(files))).rejects.toThrow(
      "classic-skin: entry count exceeds 128",
    );
    expect(decode).not.toHaveBeenCalled();
  });

  it("rejects an entry larger than 8 MiB before bitmap decoding", async () => {
    const decode = bitmapDecodeGuard();

    await expect(
      parseSkin(
        archiveWithBitmap({
          "expanded.bin": new Uint8Array(MAX_SKIN_ENTRY_BYTES + 1),
        }),
      ),
    ).rejects.toThrow("classic-skin: expanded entry size exceeds 8 MiB");
    expect(decode).not.toHaveBeenCalled();
  });

  it("rejects total expanded content larger than 32 MiB before bitmap decoding", async () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < 4; i += 1) {
      files[`expanded-${i}.bin`] = new Uint8Array(MAX_SKIN_ENTRY_BYTES);
    }
    files["expanded-overage.bin"] = Uint8Array.of(0);
    const decode = bitmapDecodeGuard();

    await expect(parseSkin(archiveWithBitmap(files))).rejects.toThrow(
      "classic-skin: expanded size exceeds 32 MiB",
    );
    expect(decode).not.toHaveBeenCalled();
  });

  it("accepts an archive at the exact compressed-size boundary", async () => {
    await expect(parseSkin(exactStoredArchiveSize().slice().buffer)).resolves.toMatchObject({
      sprites: {},
    });
  });

  it("accepts an entry at the exact expanded-entry-size boundary", async () => {
    await expect(
      parseSkin(archive({ "expanded.bin": new Uint8Array(MAX_SKIN_ENTRY_BYTES) })),
    ).resolves.toMatchObject({ sprites: {} });
  });

  it("accepts total expanded content at the exact 32 MiB boundary", async () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < 4; i += 1) {
      files[`expanded-${i}.bin`] = new Uint8Array(MAX_SKIN_ENTRY_BYTES);
    }

    await expect(parseSkin(archive(files))).resolves.toMatchObject({ sprites: {} });
  });

  it("accepts exactly 128 entries", async () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < MAX_SKIN_ENTRIES; i += 1) {
      files[`entry-${i}.txt`] = Uint8Array.of(0);
    }

    await expect(parseSkin(archive(files))).resolves.toMatchObject({ sprites: {} });
  });
});
