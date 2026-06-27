import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom lacks the APIs PlayerProvider touches. These shims let the provider
// mount and exercise its public behavior (EQ/volume clamping, track stepping)
// without a real Web Audio backend.

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Minimal AudioContext: every node is a stub with the methods the graph wiring
// calls (connect + the per-node value bags the EQ chain mutates).
class StubAudioNode {
  connect() {
    return this;
  }
  disconnect() {}
}
class StubParam {
  value = 0;
}
class StubAudioContext {
  destination = new StubAudioNode();
  createMediaElementSource() {
    return new StubAudioNode();
  }
  createAnalyser() {
    return Object.assign(new StubAudioNode(), {
      fftSize: 2048,
      smoothingTimeConstant: 0,
      frequencyBinCount: 64,
      getByteFrequencyData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
    });
  }
  createBiquadFilter() {
    return Object.assign(new StubAudioNode(), {
      type: "peaking",
      frequency: new StubParam(),
      Q: new StubParam(),
      gain: new StubParam(),
    });
  }
  createGain() {
    return Object.assign(new StubAudioNode(), { gain: new StubParam() });
  }
  resume() {
    return Promise.resolve();
  }
}
(window as unknown as { AudioContext: unknown }).AudioContext = StubAudioContext;

// jsdom doesn't implement media playback.
HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
HTMLMediaElement.prototype.pause = vi.fn();
HTMLMediaElement.prototype.load = vi.fn();

// A reliable in-memory localStorage (jsdom's isn't available under this runner).
const store = new Map<string, string>();
const memoryStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};
Object.defineProperty(window, "localStorage", {
  value: memoryStorage,
  configurable: true,
});
