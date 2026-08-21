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
