import { describe, expect, it } from "vitest";
import { skinMuseumUrl } from "../src";

describe("skinMuseumUrl", () => {
  it("builds a Skin Museum CDN URL from an MD5", () => {
    expect(skinMuseumUrl("5e4f10275dcb1fb211d4a8b4f1bda236")).toBe(
      "https://r2.webampskins.org/skins/5e4f10275dcb1fb211d4a8b4f1bda236.wsz",
    );
  });
});
