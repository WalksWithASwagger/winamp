import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicEqWindow, PlayerProvider } from "../src";

beforeEach(() => {
  globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
  window.localStorage.clear();
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("ClassicEqWindow", () => {
  it("renders the EQ window with on toggle, preamp + 10 band sliders, and the graph", () => {
    const { container } = render(
      <PlayerProvider tracks={[]}>
        <ClassicEqWindow skinUrl="http://example.test/skin.wsz" />
      </PlayerProvider>,
    );
    const win = container.querySelector("[data-eq-status]") as HTMLElement;
    expect(win).toBeTruthy();
    const inner = win.firstElementChild as HTMLElement;
    // Sliders are the elements with touch-action: none (preamp + 10 bands).
    const sliders = [...inner.querySelectorAll("div")].filter(
      (d) => d.style.touchAction === "none",
    );
    expect(sliders.length).toBe(11);
    // ON toggle is a button; the EQ curve is a canvas.
    expect(inner.querySelectorAll("button").length).toBe(1);
    expect(inner.querySelector("canvas")).toBeTruthy();
  });

  it("collapses to a 14px shade bar on title-bar double-click", () => {
    const { container } = render(
      <PlayerProvider tracks={[]}>
        <ClassicEqWindow skinUrl="http://example.test/skin.wsz" />
      </PlayerProvider>,
    );
    const win = () => container.querySelector("[data-eq-status]") as HTMLElement;
    expect(win().dataset.shade).toBe("false");
    fireEvent.doubleClick(
      container.querySelector('[title="Double-click to toggle windowshade"]')!,
    );
    expect(win().dataset.shade).toBe("true");
    expect((win().firstElementChild as HTMLElement).style.height).toBe("14px");
  });
});
