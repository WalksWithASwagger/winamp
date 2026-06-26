import { describe, expect, it } from "vitest";
import {
  FONT_CHAR_HEIGHT,
  FONT_CHAR_WIDTH,
  glyphFor,
  TEXT_SPRITES,
} from "../src/classic/font";

describe("bitmap font", () => {
  it("maps characters to glyph sprites case-insensitively", () => {
    expect(glyphFor("C")).toBe(glyphFor("c"));
    expect(glyphFor("a")).toBe("CHAR_97");
    expect(glyphFor("5")).toBe("CHAR_53");
    expect(glyphFor(" ")).toBe("CHAR_32");
  });

  it("returns undefined for unsupported characters", () => {
    expect(glyphFor("€")).toBeUndefined();
  });

  it("generates 5×6 glyph defs for every font entry", () => {
    expect(TEXT_SPRITES.length).toBeGreaterThan(60);
    for (const s of TEXT_SPRITES) {
      expect(s.width).toBe(FONT_CHAR_WIDTH);
      expect(s.height).toBe(FONT_CHAR_HEIGHT);
      expect(s.name).toMatch(/^CHAR_\d+$/);
    }
  });
});
