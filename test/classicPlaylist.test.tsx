import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ClassicPlaylistWindow,
  PlayerProvider,
  usePlayer,
  type PlayerTrack,
} from "../src";

const tracks: PlayerTrack[] = [
  { id: "a", number: 1, title: "A", person: "x", bpm: 0, audioUrl: "/a.mp3", art: { palette: ["#0f0"] } },
  { id: "b", number: 2, title: "B", person: "x", bpm: 0, audioUrl: "/b.mp3", art: { palette: ["#0f0"] } },
  { id: "c", number: 3, title: "C", person: "x", bpm: 0, art: { palette: ["#0f0"] } }, // unplayable
];

beforeEach(() => {
  globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
  window.localStorage.clear();
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("ClassicPlaylistWindow", () => {
  it("renders one row per track and plays a playable row on click", () => {
    let api: ReturnType<typeof usePlayer>;
    function Probe() {
      api = usePlayer();
      return null;
    }
    const { container } = render(
      <PlayerProvider tracks={tracks}>
        <Probe />
        <ClassicPlaylistWindow skinUrl="http://example.test/skin.wsz" />
      </PlayerProvider>,
    );
    const win = container.querySelector("[data-pl-status]") as HTMLElement;
    const rows = [...win.querySelectorAll<HTMLElement>("div[title]")].filter((d) =>
      /^\d+\.\s/.test(d.textContent ?? ""),
    );
    expect(rows.length).toBe(3);

    act(() => (rows[1] as HTMLElement).click());
    expect(api!.currentId).toBe("b");

    // Unplayable row is dimmed and does not change the current track.
    act(() => (rows[2] as HTMLElement).click());
    expect(api!.currentId).toBe("b");
  });

  it("collapses to a 14px shade bar on title-bar double-click", () => {
    const { container } = render(
      <PlayerProvider tracks={tracks}>
        <ClassicPlaylistWindow skinUrl="http://example.test/skin.wsz" />
      </PlayerProvider>,
    );
    const win = () => container.querySelector("[data-pl-status]") as HTMLElement;
    expect(win().dataset.shade).toBe("false");
    fireEvent.doubleClick(
      container.querySelector('[title="Double-click to toggle windowshade"]')!,
    );
    expect(win().dataset.shade).toBe("true");
    expect((win().firstElementChild as HTMLElement).style.height).toBe("14px");
  });
});
