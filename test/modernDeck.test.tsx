import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerProvider, WinampPlayer, type PlayerTrack } from "../src";
import { formatDeckTime } from "../src/modernDeck/Transport";

const tracks: PlayerTrack[] = [
  { id: "a", number: 1, title: "First", person: "Artist", bpm: 100, audioUrl: "/a.mp3", art: { palette: ["#0f0"] } },
  { id: "b", number: 2, title: "Second", person: "Artist", bpm: 110, audioUrl: "/b.mp3", art: { palette: ["#0f0"] } },
  { id: "c", number: 3, title: "Unavailable", person: "Artist", bpm: 0, art: { palette: ["#0f0"] } },
];

beforeEach(() => {
  globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const renderModern = () =>
  render(
    <PlayerProvider tracks={tracks}>
      <WinampPlayer storageKey="modernDeckTest" />
    </PlayerProvider>,
  );

describe("modern deck extracted behavior", () => {
  it("formats transport time at the display boundary", () => {
    expect(formatDeckTime(Number.NaN)).toBe("0:00");
    expect(formatDeckTime(-1)).toBe("0:00");
    expect(formatDeckTime(65.9)).toBe("1:05");
  });

  it("persists EQ presets and clears the preset after a band change", () => {
    renderModern();
    fireEvent.click(screen.getByRole("button", { name: "Toggle equalizer" }));

    const eqToggle = screen.getByRole("button", { name: "Toggle equalizer" });
    const eq = screen.getByRole("region", { name: "Equalizer" });
    expect(eqToggle).toHaveAttribute("aria-controls", eq.id);

    const rock = within(eq).getByRole("button", { name: "Rock" });
    fireEvent.click(rock);
    expect(rock).toHaveAttribute("aria-pressed", "true");
    expect(within(eq).getByRole("slider", { name: "60 Hz equalizer" })).toHaveValue("5");
    expect(JSON.parse(window.localStorage.getItem("modernDeckTest")!)).toMatchObject({
      eqPreset: "Rock",
      eq: [5, 4, 2, 0, -1, 0, 2, 4, 4, 5],
    });

    fireEvent.change(within(eq).getByRole("slider", { name: "60 Hz equalizer" }), {
      target: { value: "2" },
    });
    expect(rock).toHaveAttribute("aria-pressed", "false");
    expect(JSON.parse(window.localStorage.getItem("modernDeckTest")!)).toMatchObject({
      eqPreset: null,
      eq: [2, 4, 2, 0, -1, 0, 2, 4, 4, 5],
    });
  });

  it("restores persisted EQ and double-size state on mount", () => {
    window.localStorage.setItem(
      "modernDeckTest",
      JSON.stringify({ doubled: true, eq: [5, 4, 2, 0, -1, 0, 2, 4, 4, 5], eqPreset: "Rock" }),
    );
    renderModern();

    expect(screen.getByRole("button", { name: "Double size" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle equalizer" }));
    expect(screen.getByRole("button", { name: "Rock" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("slider", { name: "60 Hz equalizer" })).toHaveValue("5");
  });

  it("keeps playlist selection, unavailable rows, and disclosure wiring intact", () => {
    renderModern();
    fireEvent.click(screen.getByRole("button", { name: "Toggle playlist" }));

    const playlistToggle = screen.getByRole("button", { name: "Toggle playlist" });
    const playlist = screen.getByRole("region", { name: "Playlist" });
    expect(playlistToggle).toHaveAttribute("aria-controls", playlist.id);
    expect(within(playlist).getByText("2/3 recorded")).toBeInTheDocument();

    const second = within(playlist).getByRole("button", { name: /02\. Second by Artist/ });
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-current", "true");
    expect(within(playlist).getByRole("button", { name: /Unavailable.*unavailable/ })).toBeDisabled();
  });

  it("preserves shade, double-size, and persisted window state", () => {
    renderModern();
    const deck = document.querySelector(".deck")!;
    const doubleSize = screen.getByRole("button", { name: "Double size" });
    fireEvent.click(doubleSize);
    expect(doubleSize).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(window.localStorage.getItem("modernDeckTest")!)).toMatchObject({ doubled: true });

    fireEvent.click(screen.getByRole("button", { name: "Collapse player" }));
    expect(deck).toHaveClass("is-shaded");
    expect(deck.querySelector(".deck-body")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expand player" }));
    expect(deck).not.toHaveClass("is-shaded");
    expect(deck.querySelector(".deck-body")).toBeTruthy();
  });
});
