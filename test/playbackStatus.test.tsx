import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ClassicPlaylistWindow,
  PlayerProvider,
  WinampPlayer,
  usePlayer,
  type PlayerTrack,
} from "../src";

const tracks: PlayerTrack[] = [
  { id: "a", number: 1, title: "First", person: "Artist", bpm: 0, audioUrl: "/a.mp3", art: { palette: ["#0f0"] } },
];

beforeEach(() => {
  globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function renderWithCue(player: ReactNode) {
  const holder: { cue?: (id: string) => void } = {};
  function Probe() {
    holder.cue = usePlayer().cue;
    return null;
  }
  render(
    <PlayerProvider tracks={tracks}>
      <Probe />
      {player}
    </PlayerProvider>,
  );
  return holder;
}

describe("playback status surfaces", () => {
  it("shows an accessible modern retry action after a media error", () => {
    const holder = renderWithCue(<WinampPlayer />);
    const audio = document.querySelector("audio")!;
    act(() => holder.cue!("a"));
    act(() => fireEvent.error(audio));

    expect(screen.getByRole("alert")).toHaveTextContent("Unable to play this track.");
    act(() => fireEvent.click(screen.getByRole("button", { name: "Retry" })));
    expect(screen.getByText("Loading track…")).toBeInTheDocument();
  });

  it("exposes the same retry action from the classic playlist surface", () => {
    const holder = renderWithCue(
      <ClassicPlaylistWindow skinUrl="http://example.test/skin.wsz" />,
    );
    const audio = document.querySelector("audio")!;
    act(() => holder.cue!("a"));
    act(() => fireEvent.error(audio));

    expect(screen.getByRole("alert")).toHaveTextContent("Unable to play this track.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
