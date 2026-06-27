import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  PlayerProvider,
  usePlayer,
  usePlayerKeyboardShortcuts,
  type PlayerTrack,
} from "../src";

const tracks: PlayerTrack[] = [
  { id: "a", number: 1, title: "A", person: "x", bpm: 0, audioUrl: "/a.mp3", art: { palette: ["#0f0"] } },
];

type Api = ReturnType<typeof usePlayer>;

function mount() {
  const holder: { api: Api } = { api: null as unknown as Api };
  function Harness() {
    usePlayerKeyboardShortcuts();
    holder.api = usePlayer();
    return null;
  }
  render(
    <PlayerProvider tracks={tracks}>
      <Harness />
    </PlayerProvider>,
  );
  return holder;
}

const key = (code: string, target?: EventTarget) =>
  act(() => {
    const e = new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true });
    (target ?? window).dispatchEvent(e);
  });

afterEach(() => {
  document.body.innerHTML = "";
});

describe("usePlayerKeyboardShortcuts", () => {
  it("changes volume with the up/down arrows (clamped)", () => {
    const h = mount();
    expect(h.api.volume).toBeCloseTo(0.85);
    key("ArrowDown");
    expect(h.api.volume).toBeCloseTo(0.8);
    key("ArrowUp");
    expect(h.api.volume).toBeCloseTo(0.85);
  });

  it("ignores keys while a form field is focused", () => {
    const h = mount();
    const input = document.createElement("input");
    document.body.appendChild(input);
    key("ArrowDown", input);
    expect(h.api.volume).toBeCloseTo(0.85);
  });
});
