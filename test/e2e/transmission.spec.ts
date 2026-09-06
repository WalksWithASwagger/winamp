import { Buffer } from "node:buffer";
import { expect, test, type Page, type Route } from "@playwright/test";
import { transmissionFixture as release } from "../fixtures/transmission";

function tone(seconds: number) {
  const rate = 16000;
  const bytes = seconds * rate * 2;
  const wav = Buffer.alloc(44 + bytes);
  wav.write("RIFF"); wav.writeUInt32LE(bytes + 36, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(bytes, 40);
  for (let i = 0; i < seconds * rate; i++) wav.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 220 / rate) * 400), 44 + i * 2);
  return wav;
}
// Browsers need byte-range responses to seek encoded media, including WAV fixtures.
function serveAudio(route: Route, body: Buffer) {
  const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? "");
  const start = range ? Number(range[1]) : 0;
  const end = range?.[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
  return route.fulfill({
    status: range ? 206 : 200,
    contentType: "audio/wav",
    headers: { "Accept-Ranges": "bytes", ...(range ? { "Content-Range": `bytes ${start}-${end}/${body.length}` } : {}) },
    body: body.subarray(start, end + 1),
  });
}
const programme = tone(30);
const note = tone(15);
const audioTime = (page: Page) => page.locator("audio").evaluate((el: HTMLAudioElement) => el.currentTime);
async function expectAdvancing(page: Page) {
  const start = await audioTime(page);
  await expect.poll(() => audioTime(page)).toBeGreaterThan(start + 0.2);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/transmission-001.json", (route) => route.fulfill({ json: { release } }));
  await page.route("**/audio/test-programme.wav", (route) => serveAudio(route, programme));
  await page.route("**/audio/test-note.wav", (route) => serveAudio(route, note));
});

test("unapproved release has no media element or dead playback controls", async ({ page }) => {
  await page.route("**/transmission-001.json", (route) => route.fulfill({ json: { release: null } }));
  await page.goto("/transmission-001");
  await expect(page.getByRole("heading", { name: "A signal is taking shape." })).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toHaveCount(0);
});

test("keyboard starts real media; pause, chapter seek, note return and replay work", async ({ page, browserName }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto("/transmission-001");
  const audio = page.locator("audio");
  await expect(audio).toHaveJSProperty("paused", true);
  // WebKit on macOS uses Option-Tab to include links in keyboard navigation.
  const tab = browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
  await page.keyboard.press(tab);
  await expect(page.getByRole("link", { name: "Ghost Radio home" })).toBeFocused();
  await page.keyboard.press(tab);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expectAdvancing(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const pausedAt = await audioTime(page);
  await page.waitForTimeout(350);
  expect(await audioTime(page)).toBeCloseTo(pausedAt, 1);
  await page.getByRole("button", { name: /02 \/ 0:10/ }).click();
  await expect(page.getByRole("heading", { name: "The Dark’s Just a Door" })).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expectAdvancing(page);
  const bookmark = await audioTime(page);
  await page.getByRole("button", { name: "Hear the artist ↗" }).click();
  await expect(page.getByRole("button", { name: "Return to transmission ↗" })).toBeFocused();
  await expect(audio).toHaveAttribute("src", release.note.audioUrl);
  await expectAdvancing(page);
  await page.getByRole("button", { name: "Return to transmission ↗" }).press("Enter");
  await expect(audio).toHaveAttribute("src", release.audioUrl);
  await expect.poll(() => audioTime(page)).toBeGreaterThanOrEqual(bookmark);
  expect(await audioTime(page)).toBeLessThan(bookmark + 1.5);
  await expectAdvancing(page);
  await expect(page.getByRole("button", { name: "Hear the artist ↗" })).toBeFocused();
  await expect(audio).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("transmission-desktop.png"), fullPage: true });
  await page.getByRole("slider").focus();
  await page.getByRole("slider").press("End");
  await expect(page.getByRole("button", { name: "Replay", exact: true })).toBeVisible();
  await expect(audio).toHaveJSProperty("paused", true);
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expectAdvancing(page);
  expect(await audioTime(page)).toBeLessThan(3);
  expect(errors).toEqual([]);
});

test("timestamp and paused bookmark survive rapid detours; manual copy keeps programme time", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true }));
  await page.goto("/transmission-001?t=12");
  const audio = page.locator("audio");
  await expect.poll(() => audioTime(page)).toBeCloseTo(12, 1);
  await expect(audio).toHaveJSProperty("paused", true);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Hear the artist ↗" }).click();
    await page.getByRole("button", { name: "Copy this moment" }).click();
    await expect(page.getByRole("textbox", { name: "Copy this link" })).toHaveValue("https://ghost.radio.fm/transmission-001?t=12");
    await page.getByRole("button", { name: "Return to transmission ↗" }).click();
    await expect.poll(() => audioTime(page)).toBeCloseTo(12, 1);
    await expect(audio).toHaveJSProperty("paused", true);
  }
});

test("note load failure is recoverable without losing the programme bookmark", async ({ page }) => {
  let fail = true;
  await page.route("**/audio/test-note.wav", (route) => fail ? route.abort("failed") : serveAudio(route, note));
  await page.goto("/transmission-001?t=12");
  await expect.poll(() => audioTime(page)).toBeCloseTo(12, 1);
  await page.getByRole("button", { name: "Hear the artist ↗" }).click();
  await expect(page.getByText("The signal couldn’t load. Your place is saved.")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expectAdvancing(page);
  await page.getByRole("button", { name: "Return to transmission ↗" }).click();
  await expect.poll(() => audioTime(page)).toBeCloseTo(12, 1);
  await expect(page.locator("audio")).toHaveJSProperty("paused", true);
});

test("mobile and zoomed layouts retain controls, transcript and static mode", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/transmission-001?t=12");
  const room = page.getByRole("region", { name: "Transmission player" });
  await expect(room).toHaveAttribute("data-static", "true");
  await expect(page.locator(".tx-art")).toHaveCSS("animation-name", "none");
  await page.getByText("Read the transcript", { exact: true }).click();
  await expect(page.getByText(release.note.transcript)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of await room.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: testInfo.outputPath("transmission-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Hear the artist ↗" }).click();
  await expect(page.getByRole("button", { name: "Return to transmission ↗" })).toBeVisible();
});

test("existing local MP3 restores a timestamp through the real preview server", async ({ page }) => {
  await page.route("**/transmission-001.json", (route) => route.fulfill({ json: { release: {
    ...release, audioUrl: "/audio/gorgeous-ghost-now.mp3", duration: 70.6935,
  } } }));
  await page.goto("/transmission-001?t=12");
  await expect.poll(() => audioTime(page)).toBeCloseTo(12, 1);
  await expect(page.locator("audio")).toHaveJSProperty("paused", true);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expectAdvancing(page);
  // MP3 padding produces a small decoder-specific duration difference.
  expect(await page.locator("audio").evaluate((el: HTMLAudioElement) => el.duration)).toBeCloseTo(70.6935, 1);
});
