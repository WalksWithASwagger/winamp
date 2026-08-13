import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";

const syntheticSkin = fileURLToPath(
  new URL("../fixtures/synthetic.wsz", import.meta.url),
);

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

test("modern player renders, selects a local track, and controls playback", async ({
  page,
}) => {
  const errors = collectBrowserErrors(page);

  await page.goto("/");

  const player = page.getByRole("region", { name: "Block Party player" });
  await expect(player).toBeVisible();
  await expect(page.getByRole("heading", { name: "GHOST·RADIO" })).toBeVisible();

  for (const name of [
    "Previous track",
    "Play",
    "Next track",
    "Toggle equalizer",
    "Toggle playlist",
    "Double size",
    "Copy link to this track",
    "Collapse player",
  ]) {
    await expect(player.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await expect(player.getByRole("slider", { name: "Seek" })).toBeVisible();
  await expect(player.getByRole("slider", { name: "Volume" })).toBeVisible();

  await player.getByRole("button", { name: "Toggle playlist" }).click();
  const localTrack = player.getByRole("button", {
    name: /The Dark's Just a Door \(Remastered\)/,
  });
  await expect(localTrack).toBeVisible();
  await localTrack.click();
  await expect(localTrack).toHaveAttribute("aria-current", "true");
  await expect(
    player.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect(page.locator("audio")).toHaveJSProperty("paused", false);

  await player.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    player.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(page.locator("audio")).toHaveJSProperty("paused", true);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("classic route renders all windows from the synthetic skin fixture", async ({
  page,
}) => {
  const errors = collectBrowserErrors(page);
  await page.route("**/*.wsz", (route) =>
    route.fulfill({ path: syntheticSkin, contentType: "application/octet-stream" }),
  );

  await page.goto("/classic");

  await expect(page).toHaveTitle(/Classic Booth/);
  await expect(page.getByRole("heading", { name: "CLASSIC·BOOTH" })).toBeVisible();
  await expect(page.locator('[data-skin-status="ready"]')).toHaveCount(1);
  await expect(page.locator('[data-eq-status="ready"]')).toHaveCount(1);
  await expect(page.locator('[data-pl-status="ready"]')).toHaveCount(1);
  await expect(page.locator('[data-skin-status="ready"] canvas')).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
  await expect(page.getByText(/Gorgeous Ghost \(NOW\)/)).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});
