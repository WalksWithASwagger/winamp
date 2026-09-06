import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Transmission, TransmissionProof } from "../examples/playground/src/transmission/Transmission";
import { chapterAt, momentFromSearch, readProgramme, readRelease } from "../examples/playground/src/transmission/score";
import { transmissionFixture as release } from "./fixtures/transmission";

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/transmission-001");
  const paused = new WeakMap<HTMLMediaElement, boolean>();
  vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(function(this: HTMLMediaElement) { return paused.get(this) ?? true; });
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(function(this: HTMLMediaElement) {
    paused.set(this, true);
    this.currentTime = 0;
    const src = this.src;
    queueMicrotask(() => {
      if (this.src !== src) return;
      Object.defineProperty(this, "duration", { value: src.includes("note") ? 15 : 30, configurable: true });
      fireEvent.loadedMetadata(this);
      fireEvent.canPlay(this);
    });
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(async function(this: HTMLMediaElement) {
    paused.set(this, false); fireEvent.play(this); fireEvent.playing(this);
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function(this: HTMLMediaElement) {
    paused.set(this, true); fireEvent.pause(this);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount() {
  await act(async () => { render(<Transmission release={release} />); });
  return document.querySelector("audio")!;
}
async function click(name: string | RegExp) {
  await act(async () => fireEvent.click(screen.getByRole("button", { name })));
}
function seekTo(value: number) {
  act(() => fireEvent.change(screen.getByRole("slider"), { target: { value } }));
}

describe("transmission release and timestamps", () => {
  it("keeps unavailable content explicit and validates release boundaries", () => {
    expect(readRelease({ release: null })).toBeNull();
    expect(readRelease({ release })).toEqual(release);
    for (const bad of [
      { ...release, audioUrl: "https://other.test/file.mp3" },
      { ...release, audioUrl: "/audio/../secret.mp3" },
      { ...release, duration: Infinity },
      { ...release, duration: 301 },
      { ...release, chapters: release.chapters.map((c) => ({ ...c, at: 0 })) },
      { ...release, note: { ...release.note, transcript: "" } },
      { ...release, note: { ...release.note, audioUrl: release.audioUrl } },
    ]) expect(() => readRelease({ release: bad })).toThrow();
  });
  it("normalizes URL boundaries and selects chapters at their exact start", () => {
    expect(momentFromSearch("?t=12.5", 30)).toBe(12.5);
    expect(momentFromSearch("?t=999", 30)).toBe(30);
    for (const search of ["", "?t=-4", "?t=no", "?t=Infinity"]) expect(momentFromSearch(search, 30)).toBe(0);
    expect(chapterAt(release, 9.99)).toBe(0);
    expect(chapterAt(release, 10)).toBe(1);
    expect(chapterAt(release, 30)).toBe(2);
  });
  it("renders the preparation state without audio or dead playback controls", () => {
    render(<Transmission release={null} />);
    expect(screen.getByRole("heading", { name: "A signal is taking shape." })).toBeVisible();
    expect(document.querySelector("audio")).toBeNull();
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
  });
});

describe("listening edition", () => {
  it("plays an explicitly unapproved proof without exposing a note or public share", async () => {
    const programme = readProgramme(release);
    expect(programme).not.toHaveProperty("note");
    expect(() => readRelease({ release: programme })).toThrow();
    await act(async () => { render(<TransmissionProof programme={programme} />); });
    expect(screen.getByText(/Private listening proof/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Hear the artist/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy this moment" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ghost Radio home" })).toHaveAttribute("href", "https://ghost.radio.fm/");
    expect(screen.getByRole("link", { name: /source and media receipt/ })).toHaveAttribute("href", "/review.json");
    await click("Play");
    expect(document.querySelectorAll("audio")).toHaveLength(1);
    expect(document.querySelector("audio")!.paused).toBe(false);
    seekTo(22);
    expect(screen.getByRole("heading", { name: "Gorgeous Ghost" })).toBeVisible();
  });
  it("cues a deep link silently and updates the authored scene on seek", async () => {
    window.history.replaceState({}, "", "/transmission-001?t=12.5");
    const audio = await mount();
    expect(audio.currentTime).toBe(12.5);
    expect(audio.play).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "The Dark’s Just a Door" })).toBeVisible();
    seekTo(22);
    expect(screen.getByRole("heading", { name: "Gorgeous Ghost" })).toBeVisible();
    await click("Static mode");
    expect(screen.getByRole("region", { name: "Transmission player" })).toHaveAttribute("data-static", "true");
  });
  it.each([true, false])("returns from the note with original playing=%s and keyboard focus", async (playing) => {
    const audio = await mount();
    seekTo(12);
    if (playing) await click("Play");
    await click("Hear the artist ↗");
    expect(audio.src).toContain("test-note.wav");
    expect(screen.getByRole("button", { name: "Return to transmission ↗" })).toHaveFocus();
    expect(document.querySelectorAll("audio")).toHaveLength(1);
    await click("Return to transmission ↗");
    expect(audio.src).toContain("test-programme.wav");
    expect(audio.currentTime).toBe(12);
    expect(audio.paused).toBe(!playing);
    expect(screen.getByRole("button", { name: "Hear the artist ↗" })).toHaveFocus();
  });
  it("shares the programme bookmark during the note and offers a copy fallback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await mount();
    seekTo(12.9);
    await click("Hear the artist ↗");
    seekTo(3);
    await click("Copy this moment");
    expect(writeText).toHaveBeenCalledWith("https://ghost.radio.fm/transmission-001?t=12");
    writeText.mockRejectedValueOnce(new Error("denied"));
    await click("Copy this moment");
    expect(screen.getByRole("textbox", { name: "Copy this link" })).toHaveValue("https://ghost.radio.fm/transmission-001?t=12");
  });
  it("ends the programme with Replay and keeps a completed note selected", async () => {
    const audio = await mount();
    await click("Play");
    act(() => { audio.currentTime = 30; audio.pause(); fireEvent.ended(audio); });
    await click("Replay");
    expect(audio.currentTime).toBe(0);
    expect(audio.paused).toBe(false);
    await click("Hear the artist ↗");
    act(() => { audio.currentTime = 15; audio.pause(); fireEvent.ended(audio); });
    expect(audio.src).toContain("test-note.wav");
    expect(screen.getByRole("button", { name: "Return to transmission ↗" })).toBeVisible();
  });
  it("retries an error at the saved position without silently playing a paused programme", async () => {
    const audio = await mount();
    seekTo(12);
    act(() => fireEvent.error(audio));
    expect(screen.getByText(/Your place is saved/)).toBeVisible();
    await click("Retry");
    expect(audio.currentTime).toBe(12);
    expect(audio.paused).toBe(true);
  });
});
