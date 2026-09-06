import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayerProvider, usePlayer, type PlayerTrack } from "../src";

const tracks: PlayerTrack[] = ["programme", "note"].map((id, i) => ({
  id, number: i + 1, title: id, person: "Test", bpm: 0,
  audioUrl: `/${id}.mp3`, art: { palette: ["#efb654"] },
}));

function mount(options: Partial<ComponentProps<typeof PlayerProvider>> = {}) {
  const h = { api: null as unknown as ReturnType<typeof usePlayer> };
  function Probe() { h.api = usePlayer(); return null; }
  render(<PlayerProvider tracks={tracks} {...options}><Probe /></PlayerProvider>);
  const audio = document.querySelector("audio")!;
  let paused = true;
  Object.defineProperty(audio, "paused", { get: () => paused });
  audio.load = vi.fn();
  audio.play = vi.fn(async () => {
    paused = false;
    fireEvent.play(audio);
    fireEvent.playing(audio);
  });
  audio.pause = vi.fn(() => { paused = true; fireEvent.pause(audio); });
  const metadata = (duration = 60) => act(() => {
    Object.defineProperty(audio, "duration", { value: duration, configurable: true });
    fireEvent.loadedMetadata(audio);
    fireEvent.durationChange(audio);
  });
  return { h, audio, metadata };
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("transmission transport", () => {
  it("builds the graph when a cued track is started with toggle", async () => {
    const { h } = mount();
    act(() => h.api.cue("programme"));
    expect(h.api.analyser).toBeNull();
    await act(async () => h.api.toggle());
    expect(h.api.analyser).not.toBeNull();
    const analyser = h.api.analyser;
    act(() => h.api.toggle());
    await act(async () => h.api.toggle());
    expect(h.api.analyser).toBe(analyser);
  });

  it("recovers from buffering on native playing, without another play event", async () => {
    const { h, audio } = mount();
    await act(async () => h.api.playTrack("programme"));
    act(() => fireEvent.waiting(audio));
    expect(h.api.playbackStatus).toBe("loading");
    act(() => { fireEvent.canPlay(audio); fireEvent.playing(audio); });
    expect(h.api.playbackStatus).toBe("playing");
  });

  it("ignores a late playing event while the selected source is paused", () => {
    const { h, audio, metadata } = mount();
    act(() => h.api.cue("programme"));
    metadata();
    act(() => { fireEvent.canPlay(audio); fireEvent.playing(audio); });
    expect(h.api.playing).toBe(false);
    expect(h.api.playbackStatus).toBe("ready");
  });

  it("makes OS play and pause idempotent and disables single-mode navigation", async () => {
    const handlers = new Map<string, ((details: object) => void) | null>();
    vi.stubGlobal("navigator", { mediaSession: { setActionHandler: (name: string, fn: never) => handlers.set(name, fn) } });
    vi.stubGlobal("MediaMetadata", class {});
    const { h, audio } = mount({ transportMode: "single" });
    act(() => h.api.cue("programme"));
    await act(async () => handlers.get("play")?.({}));
    await act(async () => handlers.get("play")?.({}));
    expect(audio.paused).toBe(false);
    expect(audio.play).toHaveBeenCalledTimes(1);
    act(() => handlers.get("pause")?.({}));
    act(() => handlers.get("pause")?.({}));
    expect(audio.paused).toBe(true);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(handlers.get("nexttrack")).toBeNull();
    expect(handlers.get("previoustrack")).toBeNull();
    act(() => { h.api.next(); h.api.prev(); });
    expect(h.api.currentId).toBe("programme");
  });

  it("stops and notifies at the end in single mode even with repeat enabled", async () => {
    const ended = vi.fn();
    const { h, audio, metadata } = mount({ transportMode: "single", onTrackEnded: ended });
    await act(async () => h.api.playTrack("programme"));
    metadata();
    act(() => { h.api.setRepeat(true); audio.currentTime = 60; fireEvent.ended(audio); });
    expect(h.api.currentId).toBe("programme");
    expect(h.api.playing).toBe(false);
    expect(h.api.playbackStatus).toBe("paused");
    expect(ended).toHaveBeenCalledWith("programme");
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it("preserves default playlist advancement and repeat", async () => {
    const { h, audio } = mount();
    await act(async () => h.api.playTrack("programme"));
    await act(async () => fireEvent.ended(audio));
    expect(h.api.currentId).toBe("note");
    await act(async () => { h.api.setRepeat(true); audio.currentTime = 20; fireEvent.ended(audio); });
    expect(h.api.currentId).toBe("note");
    expect(audio.currentTime).toBe(0);
  });

  it("queues and clamps seeks until metadata, then preserves position on retry", () => {
    const { h, audio, metadata } = mount();
    act(() => { h.api.cue("programme"); h.api.seek(120); });
    expect(audio.currentTime).toBe(0);
    metadata(60);
    expect(audio.currentTime).toBe(60);
    act(() => { h.api.seek(24); fireEvent.error(audio); h.api.retry(); });
    metadata(60);
    expect(audio.currentTime).toBe(24);
    expect(h.api.time).toBe(24);
    expect(audio.play).not.toHaveBeenCalled();
    act(() => h.api.seek(-5));
    expect(audio.currentTime).toBe(0);
    act(() => h.api.seek(Infinity));
    expect(audio.currentTime).toBe(0);
  });

  it("pins the paused position when the Web Audio media clock rewinds", async () => {
    const { h, audio, metadata } = mount();
    await act(async () => h.api.playTrack("programme"));
    metadata();
    act(() => h.api.seek(12));
    const nativePause = audio.pause;
    audio.pause = () => { nativePause.call(audio); audio.currentTime = 0; };
    act(() => h.api.toggle());
    expect(audio.currentTime).toBe(12);
    expect(audio.paused).toBe(true);
  });

  it("preserves play intent when a native failure is followed by pause", async () => {
    const { h, audio, metadata } = mount();
    await act(async () => h.api.playTrack("programme"));
    metadata();
    act(() => { h.api.seek(24); fireEvent.error(audio); audio.pause(); });
    await act(async () => h.api.retry());
    metadata();
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(24);
    expect(h.api.playing).toBe(true);
  });

  it("discards queued position and late rejected play when switching sources", async () => {
    const { h, audio, metadata } = mount();
    let reject!: (error: Error) => void;
    audio.play = vi.fn(() => new Promise<void>((_, fail) => { reject = fail; }));
    act(() => { h.api.playTrack("programme"); h.api.seek(24); h.api.cue("note"); });
    metadata();
    await act(async () => reject(new Error("old source")));
    expect(audio.currentTime).toBe(0);
    expect(h.api.currentId).toBe("note");
    expect(h.api.playbackError).toBeNull();
  });
});
