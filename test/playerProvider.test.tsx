import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  EQ_BANDS,
  EQ_MAX_DB,
  PlayerProvider,
  usePlayer,
  type PlayerTrack,
} from "../src";

const tracks: PlayerTrack[] = [
  { id: "a", number: 1, title: "A", person: "x", bpm: 100, audioUrl: "/a.mp3", art: { palette: ["#111"] } },
  { id: "b", number: 2, title: "B", person: "x", bpm: 110, audioUrl: "/b.mp3", art: { palette: ["#222"] } },
  // No audioUrl → in the playlist but not playable; stepping must skip it.
  { id: "c", number: 3, title: "C", person: "x", bpm: 120, art: { palette: ["#333"] } },
];

type Api = ReturnType<typeof usePlayer>;

function mount(t: PlayerTrack[] = tracks) {
  const holder: { api: Api } = { api: null as unknown as Api };
  function Probe() {
    holder.api = usePlayer();
    return null;
  }
  render(
    <PlayerProvider tracks={t}>
      <Probe />
    </PlayerProvider>,
  );
  return holder;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("EQ constants", () => {
  it("are the classic Winamp 10-band frequencies at ±12 dB", () => {
    expect(EQ_BANDS).toEqual([60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000]);
    expect(EQ_MAX_DB).toBe(12);
  });
});

describe("PlayerProvider initial context", () => {
  it("starts idle with a flat 10-band EQ", () => {
    const { api } = mount();
    expect(api.eqGains).toHaveLength(10);
    expect(api.eqGains.every((g) => g === 0)).toBe(true);
    expect(api.currentId).toBeNull();
    expect(api.playing).toBe(false);
    expect(api.analyser).toBeNull();
    expect(api.bpm).toBeNull();
    expect(api.volume).toBe(0.85);
  });
});

describe("EQ + volume clamping", () => {
  it("clamps setEqGain to ±EQ_MAX_DB", () => {
    const h = mount();
    act(() => h.api.setEqGain(0, 100));
    expect(h.api.eqGains[0]).toBe(EQ_MAX_DB);
    act(() => h.api.setEqGain(0, -100));
    expect(h.api.eqGains[0]).toBe(-EQ_MAX_DB);
    act(() => h.api.setEqGain(3, 5));
    expect(h.api.eqGains[3]).toBe(5);
  });

  it("clamps every band in setEqGains", () => {
    const h = mount();
    act(() => h.api.setEqGains([100, -100, 6, 0, 0, 0, 0, 0, 0, 0]));
    expect(h.api.eqGains[0]).toBe(EQ_MAX_DB);
    expect(h.api.eqGains[1]).toBe(-EQ_MAX_DB);
    expect(h.api.eqGains[2]).toBe(6);
  });

  it("clamps setVolume to [0,1]", () => {
    const h = mount();
    act(() => h.api.setVolume(5));
    expect(h.api.volume).toBe(1);
    act(() => h.api.setVolume(-5));
    expect(h.api.volume).toBe(0);
    act(() => h.api.setVolume(0.5));
    expect(h.api.volume).toBe(0.5);
  });

  it("clamps setPreamp to ±EQ_MAX_DB", () => {
    const h = mount();
    expect(h.api.preamp).toBe(0);
    act(() => h.api.setPreamp(50));
    expect(h.api.preamp).toBe(EQ_MAX_DB);
    act(() => h.api.setPreamp(-50));
    expect(h.api.preamp).toBe(-EQ_MAX_DB);
  });

  it("toggles eqEnabled while preserving stored band gains", () => {
    const h = mount();
    expect(h.api.eqEnabled).toBe(true);
    act(() => h.api.setEqGain(0, 6));
    act(() => h.api.setEqEnabled(false));
    expect(h.api.eqEnabled).toBe(false);
    // Stored gains persist (bypass is at the audio graph, not the state).
    expect(h.api.eqGains[0]).toBe(6);
    act(() => h.api.setEqEnabled(true));
    expect(h.api.eqEnabled).toBe(true);
  });

  it("clamps setBalance to [-1,1] and toggles shuffle/repeat", () => {
    const h = mount();
    expect(h.api.balance).toBe(0);
    expect(h.api.shuffle).toBe(false);
    expect(h.api.repeat).toBe(false);
    act(() => h.api.setBalance(5));
    expect(h.api.balance).toBe(1);
    act(() => h.api.setBalance(-5));
    expect(h.api.balance).toBe(-1);
    act(() => h.api.setShuffle(true));
    expect(h.api.shuffle).toBe(true);
    act(() => h.api.setRepeat(true));
    expect(h.api.repeat).toBe(true);
  });
});

describe("track stepping", () => {
  it("next from nothing selects the first playable track, then wraps", () => {
    const h = mount();
    act(() => h.api.next());
    expect(h.api.currentId).toBe("a");
    act(() => h.api.next());
    expect(h.api.currentId).toBe("b");
    // "c" is unplayable, so next wraps back to "a".
    act(() => h.api.next());
    expect(h.api.currentId).toBe("a");
  });

  it("prev from nothing selects the last playable track", () => {
    const h = mount();
    act(() => h.api.prev());
    expect(h.api.currentId).toBe("b");
  });
});
