import { describe, expect, it } from "vitest";
import {
  parsePledit,
  parseViscolor,
  SKIN_SPRITES,
  SPRITE_DIMS,
} from "../src";

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
