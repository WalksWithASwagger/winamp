import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ClassicEqWindow,
  ClassicPlaylistWindow,
  ClassicWinampPlayer,
  PlayerProvider,
  WinampPlayer,
  type PlayerTrack,
} from "../src";

const tracks: PlayerTrack[] = [
  { id: "a", number: 1, title: "First", person: "Artist", bpm: 0, audioUrl: "/a.mp3", art: { palette: ["#0f0"] } },
  { id: "b", number: 2, title: "Second", person: "Artist", bpm: 0, audioUrl: "/b.mp3", art: { palette: ["#0f0"] } },
  { id: "c", number: 3, title: "Unavailable", person: "Artist", bpm: 0, art: { palette: ["#0f0"] } },
];

beforeEach(() => {
  globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("modern player accessibility", () => {
  it("names transport, ranges, disclosures, and current playlist state", () => {
    render(
      <PlayerProvider tracks={tracks}>
        <WinampPlayer theme="mono" />
      </PlayerProvider>,
    );

    expect(screen.getByRole("region", { name: "Block Party player, mono skin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous track" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("slider", { name: "Seek" })).toHaveAttribute("aria-valuetext", "0:00 of 0:00");
    expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-valuetext", "85%");

    const eqToggle = screen.getByRole("button", { name: "Toggle equalizer" });
    expect(eqToggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(eqToggle);
    expect(eqToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("slider", { name: "60 Hz equalizer" })).toHaveAttribute(
      "aria-valuetext",
      "0 decibels",
    );

    const playlistToggle = screen.getByRole("button", { name: "Toggle playlist" });
    fireEvent.click(playlistToggle);
    const playlist = screen.getByRole("region", { name: "Playlist" });
    const currentRow = within(playlist).getByRole("button", { name: /01\. First by Artist/ });
    fireEvent.click(currentRow);
    expect(currentRow).toHaveAttribute("aria-current", "true");
    expect(currentRow).toHaveAccessibleName(/current track/);
    expect(within(playlist).getByRole("button", { name: /Unavailable.*unavailable/ })).toBeDisabled();
  });
});

describe("classic player accessibility", () => {
  it("provides named controls and keyboard-capable custom sliders", () => {
    render(
      <PlayerProvider tracks={tracks}>
        <ClassicWinampPlayer skinUrl="http://example.test/skin.wsz" />
      </PlayerProvider>,
    );

    expect(screen.getByRole("region", { name: /Classic Winamp player/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle shuffle" })).toHaveAttribute("aria-pressed", "false");

    const volume = screen.getByRole("slider", { name: "Volume" });
    expect(volume).toHaveAttribute("aria-valuetext", "85%");
    fireEvent.keyDown(volume, { key: "ArrowDown" });
    expect(volume).toHaveAttribute("aria-valuetext", "84%");

    const balance = screen.getByRole("slider", { name: "Balance" });
    fireEvent.keyDown(balance, { key: "ArrowLeft" });
    expect(balance).toHaveAttribute("aria-valuetext", "5% left");

    const shuffle = screen.getByRole("button", { name: "Toggle shuffle" });
    fireEvent.click(shuffle);
    expect(shuffle).toHaveAttribute("aria-pressed", "true");

    const doubleSize = screen.getByRole("button", { name: "Toggle double size" });
    fireEvent.keyDown(doubleSize, { key: " " });
    expect(doubleSize).toHaveAttribute("aria-pressed", "true");
  });

  it("names EQ/preamp sliders and activates playlist rows from the keyboard", () => {
    const { unmount } = render(
      <PlayerProvider tracks={tracks}>
        <ClassicEqWindow skinUrl="http://example.test/skin.wsz" />
      </PlayerProvider>,
    );

    const eq = screen.getByRole("region", { name: /Classic Winamp equalizer/ });
    const preamp = within(eq).getByRole("slider", { name: "Preamp" });
    fireEvent.keyDown(preamp, { key: "ArrowUp" });
    expect(preamp).toHaveAttribute("aria-valuetext", "1 decibels");
    expect(within(eq).getByRole("slider", { name: "60 Hz equalizer" })).toHaveAttribute(
      "aria-valuetext",
      "0 decibels",
    );
    expect(within(eq).getByRole("img", { name: "Equalizer curve" })).toBeInTheDocument();

    unmount();
    render(
      <PlayerProvider tracks={tracks}>
        <ClassicPlaylistWindow skinUrl="http://example.test/skin.wsz" />
      </PlayerProvider>,
    );

    const playlist = screen.getByRole("region", { name: /Classic Winamp playlist/ });
    const second = within(playlist).getByRole("button", { name: /2\. Second - Artist/ });
    fireEvent.keyDown(second, { key: "Enter" });
    expect(second).toHaveAttribute("aria-current", "true");
  });
});
