import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://ghost.radio.fm/";
const CLASSIC_URL = `${SITE_URL}classic`;
const TRANSMISSION_URL = `${SITE_URL}transmission-001`;
const SOCIAL_IMAGE = `${SITE_URL}art/gorgeous-ghost-now.jpg`;
const SOCIAL_IMAGE_ALT =
  "A luminous silver figure floats inside a gold ring above iridescent purple and green spheres.";
const GITHUB_URL = "https://github.com/WalksWithASwagger/winamp";
const NPM_URL = "https://www.npmjs.com/package/@walkswithaswagger/winamp";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "examples/playground/dist");

const pages = [
  {
    file: "index.html",
    canonical: SITE_URL,
    socialTitle: "GHOST RADIO",
    socialDescription:
      "A pirate signal for AI music, half-finished albums, and a Winamp that still rips.",
    requireJsonLd: true,
  },
  {
    file: "classic.html",
    canonical: CLASSIC_URL,
    socialTitle: "GHOST RADIO — Classic Booth",
    socialDescription:
      "Real Winamp 2 .wsz skins, live-switchable, on the open-source ghost radio engine.",
    requireJsonLd: false,
  },
  {
    file: "transmission-001.html",
    canonical: TRANSMISSION_URL,
    socialTitle: "GHOST RADIO — Transmission 001",
    socialDescription:
      "An on-demand Ghost Radio transmission, with three visual chapters and an artist’s note.",
    requireJsonLd: false,
  },
];

function tags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
}

function attribute(tag, name) {
  return tag?.match(new RegExp(`\\b${name}=(['\"])(.*?)\\1`, "i"))?.[2];
}

function matchingTag(html, tagName, attributeName, attributeValue) {
  return tags(html, tagName).find(
    (tag) => attribute(tag, attributeName) === attributeValue,
  );
}

function assertValue(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual ?? "nothing"}`);
  }
}

function assertMeta(html, selectorAttribute, selectorValue, expectedContent) {
  const tag = matchingTag(html, "meta", selectorAttribute, selectorValue);
  assertValue(attribute(tag, "content"), expectedContent, selectorValue);
}

function jsonLdDocuments(html) {
  return [...html.matchAll(/<script\b[^>]*type=(['"])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi)].map(
    ([, , content]) => {
      try {
        return JSON.parse(content);
      } catch (error) {
        throw new Error(`invalid JSON-LD: ${error.message}`);
      }
    },
  );
}

function assertHomepageJsonLd(html) {
  const graph = jsonLdDocuments(html).flatMap((document) =>
    Array.isArray(document["@graph"]) ? document["@graph"] : [document],
  );
  const website = graph.find((node) => node["@type"] === "WebSite");
  const software = graph.find((node) => node["@type"] === "SoftwareApplication");

  assertValue(website?.name, "Ghost Radio", "WebSite name");
  assertValue(website?.url, SITE_URL, "WebSite URL");
  assertValue(software?.name, "@walkswithaswagger/winamp", "software name");
  assertValue(software?.softwareVersion, "0.3.0", "software version");
  assertValue(software?.url, NPM_URL, "software URL");
  assertValue(software?.sameAs, GITHUB_URL, "software repository");
}

export function assertPageMetadata(html, expected) {
  const canonicalTags = tags(html, "link").filter(
    (tag) => attribute(tag, "rel") === "canonical",
  );
  if (!canonicalTags.some((tag) => attribute(tag, "href") === expected.canonical)) {
    throw new Error(`missing canonical ${expected.canonical}`);
  }
  assertValue(canonicalTags.length, 1, `${expected.canonical} canonical count`);

  const description = matchingTag(html, "meta", "name", "description");
  if (!attribute(description, "content")) {
    throw new Error(`${expected.canonical} is missing a description`);
  }

  assertValue(tags(html, "h1").length, 1, `${expected.canonical} H1 count`);

  assertMeta(html, "property", "og:title", expected.socialTitle);
  assertMeta(html, "property", "og:description", expected.socialDescription);
  assertMeta(html, "property", "og:type", "website");
  assertMeta(html, "property", "og:url", expected.canonical);
  assertMeta(html, "property", "og:site_name", "Ghost Radio");
  assertMeta(html, "property", "og:image", SOCIAL_IMAGE);
  assertMeta(html, "property", "og:image:type", "image/jpeg");
  assertMeta(html, "property", "og:image:width", "360");
  assertMeta(html, "property", "og:image:height", "360");
  assertMeta(html, "property", "og:image:alt", SOCIAL_IMAGE_ALT);
  assertMeta(html, "name", "twitter:card", "summary_large_image");
  assertMeta(html, "name", "twitter:title", expected.socialTitle);
  assertMeta(html, "name", "twitter:description", expected.socialDescription);
  assertMeta(html, "name", "twitter:image", SOCIAL_IMAGE);
  assertMeta(html, "name", "twitter:image:alt", SOCIAL_IMAGE_ALT);

  if (expected.requireJsonLd) assertHomepageJsonLd(html);
}

function assertSitemap(xml) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
  const expected = [SITE_URL, CLASSIC_URL, TRANSMISSION_URL];
  if (JSON.stringify(urls) !== JSON.stringify(expected)) {
    throw new Error(`sitemap URLs: expected ${expected.join(", ")}, received ${urls.join(", ")}`);
  }
}

function assertRobots(content) {
  for (const line of ["User-agent: *", "Allow: /", `Sitemap: ${SITE_URL}sitemap.xml`]) {
    if (!content.split(/\r?\n/).includes(line)) throw new Error(`robots.txt is missing ${line}`);
  }
}

function assertLlms(content) {
  for (const value of [
    "Ghost Radio",
    "Classic Booth",
    "open-source React package",
    SITE_URL,
    CLASSIC_URL,
    TRANSMISSION_URL,
    GITHUB_URL,
    NPM_URL,
  ]) {
    if (!content.includes(value)) throw new Error(`llms.txt is missing ${value}`);
  }
}

async function main() {
  for (const page of pages) {
    const html = await readFile(path.join(distDir, page.file), "utf8");
    assertPageMetadata(html, page);
  }

  const [sitemap, robots, llms, redirects] = await Promise.all([
    readFile(path.join(distDir, "sitemap.xml"), "utf8"),
    readFile(path.join(distDir, "robots.txt"), "utf8"),
    readFile(path.join(distDir, "llms.txt"), "utf8"),
    readFile(path.join(distDir, "_redirects"), "utf8"),
    access(path.join(distDir, "art/gorgeous-ghost-now.jpg")),
  ]);

  assertSitemap(sitemap);
  assertRobots(robots);
  assertLlms(llms);
  if (!/^\/classic\s+\/classic\.html\s+200$/m.test(redirects)) {
    throw new Error("classic redirect rule is missing");
  }
  if (!/^\/transmission-001\s+\/transmission-001\.html\s+200$/m.test(redirects)) {
    throw new Error("transmission redirect rule is missing");
  }

  console.log("SEO baseline verified for 3 entrypoints and 3 discovery files.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
