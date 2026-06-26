import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicWinampPlayer } from "../src";

// useSkin fetches the skin; keep it pending so the component renders its static
// structure without network. (Sprite rendering itself is browser-verified.)
beforeEach(() => {
  globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("ClassicWinampPlayer (static window)", () => {
  it("renders the 275×116 window with the background + every placed sprite", () => {
    const { container } = render(
      <ClassicWinampPlayer skinUrl="http://example.test/skin.wsz" />,
    );
    const win = container.querySelector("[data-skin-status]") as HTMLElement;
    expect(win).toBeTruthy();

    const inner = win.firstElementChild as HTMLElement;
    expect(inner.style.width).toBe("275px");
    expect(inner.style.height).toBe("116px");
    // 1 background + 17 placed chrome sprites.
    expect(inner.children.length).toBe(18);
  });

  it("scales the outer box while keeping the inner window at native size", () => {
    const { container } = render(
      <ClassicWinampPlayer skinUrl="http://example.test/skin.wsz" scale={2} />,
    );
    const win = container.querySelector("[data-skin-status]") as HTMLElement;
    expect(win.style.width).toBe("550px");
    expect((win.firstElementChild as HTMLElement).style.transform).toBe("scale(2)");
  });
});
