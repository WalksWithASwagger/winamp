import { describe, expect, it } from "vitest";
import { THEMES, type DeckTheme } from "../src";

describe("theme packs", () => {
  const names: DeckTheme[] = ["green", "vaporwave", "mono", "amber"];

  it("defines each theme with deck-accent vars and a spectrum palette", () => {
    for (const name of names) {
      const pack = THEMES[name];
      expect(pack).toBeTruthy();
      expect(pack.vars["--deck-accent"]).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pack.vars["--wamp-bg-1"]).toBeTruthy();
      expect(pack.spectrum.length).toBeGreaterThan(0);
      expect(pack.spectrum.every((c) => /^#[0-9a-fA-F]{6}$/.test(c))).toBe(true);
    }
  });
});
