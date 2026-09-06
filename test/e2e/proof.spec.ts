import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const proofUrl = "http://127.0.0.1:4175/proof.html";

test("private real-audio proof supports chapters, keyboard playback and a finite ending", async ({ page, request }) => {
  const receipt = await (await request.get("http://127.0.0.1:4175/review.json")).json();
  const range = await request.get("http://127.0.0.1:4175/audio/proof-programme.wav", { headers: { Range: "bytes=0-43" } });
  expect(range.status()).toBe(206);
  expect(range.headers()["content-range"]).toMatch(/^bytes 0-43\//);
  expect(await range.body()).toHaveLength(44);
  await page.goto(proofUrl);
  await expect(page.getByText(/Private listening proof · not approved/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Hear the artist|Copy this moment/ })).toHaveCount(0);
  await expect(page.locator("audio")).toHaveCount(1);
  const play = page.getByRole("button", { name: "Play", exact: true });
  await play.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.locator("audio").evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0.1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: /02 \/.*Dark’s Just a Door/ }).click();
  await expect(page.getByRole("heading", { name: "The Dark’s Just a Door (Remastered)" })).toBeVisible();
  await expect.poll(() => page.locator("audio").evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeCloseTo(receipt.sources[0].decodedDuration, 1);
  await page.getByRole("button", { name: /03 \/.*Gorgeous Ghost/ }).click();
  await expect(page.getByRole("heading", { name: "Gorgeous Ghost", exact: true })).toBeVisible();
  const position = page.getByRole("slider", { name: "Transmission position" });
  await position.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Replay", exact: true })).toBeVisible();
  expect(await page.locator("audio").evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
});

test("private proof stays usable on a narrow screen with reduced motion and zoom", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(proofUrl);
  await expect(page.getByRole("region", { name: "Transmission player" })).toHaveAttribute("data-static", "true");
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  const layout = await page.evaluate(() => ({
    width: window.innerWidth, scroll: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll("main *")].filter((element) => element.getBoundingClientRect().right > window.innerWidth).map((element) => ({ tag: element.tagName, class: element.className, text: element.textContent?.slice(0, 60) })),
  }));
  expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /source and media receipt/ }).click();
  await expect(page).toHaveURL(/review\.json$/);
});

test("normal production build cannot expose private proof assets or enable proof by query", async ({ page, request }) => {
  for (const file of ["proof.html", "transmission-proof.json", "review.json", "audio/proof-programme.wav"]) {
    await expect(readFile(`examples/playground/dist/${file}`)).rejects.toMatchObject({ code: "ENOENT" });
    const response = await request.get(`/${file}`);
    expect(await response.text()).not.toContain("Private listening proof");
  }
  await page.goto("/transmission-001?proof=true");
  await expect(page.getByRole("heading", { name: "A signal is taking shape." })).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(0);
});
