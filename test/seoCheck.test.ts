import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertPageMetadata } from "../scripts/check-seo.mjs";

describe("SEO checker", () => {
  it("declares the standard sitemap namespace", () => {
    const sitemap = readFileSync(
      "examples/playground/public/sitemap.xml",
      "utf8",
    );

    expect(sitemap).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
  });

  it("fails when a page is missing its canonical", () => {
    const html = readFileSync("test/fixtures/seo/missing-canonical.html", "utf8");

    expect(() =>
      assertPageMetadata(html, {
        canonical: "https://ghost.radio.fm/",
        socialTitle: "GHOST RADIO",
        socialDescription: "Ghost Radio fixture",
        requireJsonLd: false,
      }),
    ).toThrow("missing canonical https://ghost.radio.fm/");
  });
});

describe("Transmission 001 discovery", () => {
  it("validates its own canonical metadata and discovery paths", () => {
    const html = readFileSync("examples/playground/transmission-001.html", "utf8");
    expect(() => assertPageMetadata(html, {
      canonical: "https://ghost.radio.fm/transmission-001",
      socialTitle: "GHOST RADIO — Transmission 001",
      socialDescription: "An on-demand Ghost Radio transmission, with three visual chapters and an artist’s note.",
      requireJsonLd: false,
    })).not.toThrow();
    expect(readFileSync("examples/playground/public/sitemap.xml", "utf8")).toContain("<loc>https://ghost.radio.fm/transmission-001</loc>");
    expect(readFileSync("examples/playground/public/_redirects", "utf8")).toMatch(/^\/transmission-001\s+\/transmission-001\.html\s+200$/m);
  });
});
