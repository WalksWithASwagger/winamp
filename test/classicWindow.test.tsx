import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicWinampPlayer, PlayerProvider } from "../src";

const renderWindow = (props: { skinUrl: string; scale?: number; storageKey?: string }) =>
  render(
    <PlayerProvider tracks={[]}>
      <ClassicWinampPlayer {...props} />
    </PlayerProvider>,
  );

// useSkin fetches the skin; keep it pending so the component renders its static
// structure without network. (Sprite rendering itself is browser-verified.)
beforeEach(() => {
  globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
  window.localStorage.clear();
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("ClassicWinampPlayer", () => {
  it("renders the 275×116 window with chrome, transport, sliders, and readouts", () => {
    const { container } = renderWindow({ skinUrl: "http://example.test/skin.wsz" });
    const win = container.querySelector("[data-skin-status]") as HTMLElement;
    expect(win).toBeTruthy();

    const inner = win.firstElementChild as HTMLElement;
    expect(inner.style.width).toBe("275px");
    expect(inner.style.height).toBe("116px");
    // 5 transport + shade + shuffle + repeat buttons; plus the spectrum canvas.
    expect(inner.querySelectorAll("button").length).toBe(8);
    expect(inner.querySelector("canvas")).toBeTruthy();
  });

  it("scales the outer box while keeping the inner window at native size", () => {
    const { container } = renderWindow({ skinUrl: "http://example.test/skin.wsz", scale: 2 });
    const win = container.querySelector("[data-skin-status]") as HTMLElement;
    expect(win.style.width).toBe("550px");
    expect((win.firstElementChild as HTMLElement).style.transform).toBe("scale(2)");
  });

  it("collapses to a 14px shade bar when the windowshade button is clicked", () => {
    const { container } = renderWindow({ skinUrl: "http://example.test/skin.wsz" });
    const win = () => container.querySelector("[data-skin-status]") as HTMLElement;
    expect(win().dataset.shade).toBe("false");
    const shadeBtn = container.querySelector('button[title="Windowshade"]') as HTMLElement;
    act(() => shadeBtn.click());
    expect(win().dataset.shade).toBe("true");
    expect((win().firstElementChild as HTMLElement).style.height).toBe("14px");
  });

  it("toggles double-size on title-bar double-click (persisted)", () => {
    const { container } = renderWindow({ skinUrl: "http://example.test/skin.wsz" });
    const win = () => container.querySelector("[data-skin-status]") as HTMLElement;
    const toggle = container.querySelector(
      '[title="Double-click to toggle double size"]',
    ) as HTMLElement;
    fireEvent.doubleClick(toggle);
    expect(win().style.width).toBe("550px");
    expect(window.localStorage.getItem("classicWinamp:doubleSize")).toBe("true");
  });
});
