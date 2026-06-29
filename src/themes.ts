// Curated theme packs for the modern deck. Each maps the `--wamp-*` tokens
// (defined in styles.css) and a matching spectrum palette. Distinct from .wsz
// classic skins — these reskin the modern <WinampPlayer />.

/** Palette-only themes — recolor the deck via `--wamp-*` tokens. */
export type ColorTheme =
  | "green"
  | "vaporwave"
  | "mono"
  | "amber"
  | "sunset"
  | "ice"
  | "crimson";

/** Graphic skins — a palette plus imagery, pixel font, scanlines, and glow. */
export type GraphicSkin = "ghost" | "terminal" | "crt-amber";

/** Anything the deck `theme` prop accepts. */
export type DeckTheme = ColorTheme | GraphicSkin;

export type ThemePack = {
  /** CSS custom-property overrides applied to the deck root. */
  vars: Record<string, string>;
  /** Spectrum analyzer bar colors. */
  spectrum: string[];
  /** Optional title-bar logo (data-URI or URL) — graphic skins ship one. */
  markSrc?: string;
};

const COLOR_THEMES = {
  green: {
    vars: {
      "--deck-accent": "#27c93f",
      "--wamp-cyan": "#39ff7a",
      "--wamp-yellow": "#b6ff3a",
      "--wamp-dim": "#5f8a6a",
      "--wamp-muted": "#9fd8ab",
      "--wamp-text": "#cdeacd",
      "--wamp-bg-1": "#1c2a1f",
      "--wamp-bg-2": "#111a13",
      "--wamp-bg-3": "#0b110c",
      "--wamp-bar-1": "#2c4231",
      "--wamp-bar-2": "#1c2a1f",
      "--wamp-bar-3": "#141f17",
      "--wamp-btn-1": "#28402e",
      "--wamp-btn-2": "#16241a",
      "--wamp-btn-text": "#86c596",
      "--wamp-key-text": "#bfead0",
      "--wamp-lcd-1": "#04140a",
      "--wamp-lcd-2": "#020a05",
      "--wamp-edge-top": "#3c5a44",
    },
    spectrum: ["#39ff7a", "#27c93f", "#b6ff3a", "#1f8a3a", "#7CFC00"],
  },
  vaporwave: {
    vars: {
      "--deck-accent": "#ff77e1",
      "--wamp-cyan": "#00eaff",
      "--wamp-yellow": "#ffe66d",
      "--wamp-dim": "#8a6aa8",
      "--wamp-muted": "#d9b8ff",
      "--wamp-text": "#f3e0ff",
      "--wamp-bg-1": "#3a2358",
      "--wamp-bg-2": "#241540",
      "--wamp-bg-3": "#190d2e",
      "--wamp-bar-1": "#5a3a86",
      "--wamp-bar-2": "#3a2358",
      "--wamp-bar-3": "#2a1846",
      "--wamp-btn-1": "#4a2e72",
      "--wamp-btn-2": "#2a1846",
      "--wamp-btn-text": "#d9b8ff",
      "--wamp-key-text": "#f3e0ff",
      "--wamp-lcd-1": "#160a28",
      "--wamp-lcd-2": "#0c0618",
      "--wamp-edge-top": "#7a52a8",
    },
    spectrum: ["#ff77e1", "#00eaff", "#b76cff", "#ffe66d", "#ff6ec7"],
  },
  mono: {
    vars: {
      "--deck-accent": "#d6dae1",
      "--wamp-cyan": "#eef1f5",
      "--wamp-yellow": "#c4c8d0",
      "--wamp-dim": "#7d828c",
      "--wamp-muted": "#b6bac3",
      "--wamp-text": "#e8eaee",
      "--wamp-bg-1": "#33363b",
      "--wamp-bg-2": "#1c1e22",
      "--wamp-bg-3": "#141518",
      "--wamp-bar-1": "#4b4e55",
      "--wamp-bar-2": "#33363b",
      "--wamp-bar-3": "#26282d",
      "--wamp-btn-1": "#42454c",
      "--wamp-btn-2": "#26282d",
      "--wamp-btn-text": "#b6bac3",
      "--wamp-key-text": "#e8eaee",
      "--wamp-lcd-1": "#0a0b0d",
      "--wamp-lcd-2": "#040506",
      "--wamp-edge-top": "#5a5e66",
    },
    spectrum: ["#eef1f5", "#c4c8d0", "#9aa0aa", "#d6dae1", "#7d828c"],
  },
  amber: {
    vars: {
      "--deck-accent": "#ffb000",
      "--wamp-cyan": "#ffcf4d",
      "--wamp-yellow": "#ffd970",
      "--wamp-dim": "#8a6a2a",
      "--wamp-muted": "#e0b96a",
      "--wamp-text": "#ffd98a",
      "--wamp-bg-1": "#221806",
      "--wamp-bg-2": "#160f04",
      "--wamp-bg-3": "#0e0902",
      "--wamp-bar-1": "#3a2a0a",
      "--wamp-bar-2": "#221806",
      "--wamp-bar-3": "#180f04",
      "--wamp-btn-1": "#352607",
      "--wamp-btn-2": "#1c1304",
      "--wamp-btn-text": "#d09a3a",
      "--wamp-key-text": "#ffce7a",
      "--wamp-lcd-1": "#140c02",
      "--wamp-lcd-2": "#0a0601",
      "--wamp-edge-top": "#5a3f12",
    },
    spectrum: ["#ffb000", "#ffcf4d", "#ff8c00", "#ffd970", "#cc7000"],
  },
  sunset: {
    vars: {
      "--deck-accent": "#ff6f5e",
      "--wamp-cyan": "#ffd27a",
      "--wamp-yellow": "#ffb15c",
      "--wamp-dim": "#9a6a6a",
      "--wamp-muted": "#f0b8a8",
      "--wamp-text": "#ffe2d2",
      "--wamp-bg-1": "#3a2030",
      "--wamp-bg-2": "#26121f",
      "--wamp-bg-3": "#1a0c16",
      "--wamp-bar-1": "#5a2f43",
      "--wamp-bar-2": "#3a2030",
      "--wamp-bar-3": "#2a1624",
      "--wamp-btn-1": "#4a2738",
      "--wamp-btn-2": "#2a1624",
      "--wamp-btn-text": "#f0a890",
      "--wamp-key-text": "#ffe2d2",
      "--wamp-lcd-1": "#1e0c16",
      "--wamp-lcd-2": "#12060d",
      "--wamp-edge-top": "#7a3f55",
    },
    spectrum: ["#ff6f5e", "#ffb15c", "#ffd27a", "#ff8e6b", "#e0556a"],
  },
  ice: {
    vars: {
      "--deck-accent": "#5fd0ff",
      "--wamp-cyan": "#bdf0ff",
      "--wamp-yellow": "#9ad8ff",
      "--wamp-dim": "#6a8395",
      "--wamp-muted": "#bcd6e6",
      "--wamp-text": "#e6f4ff",
      "--wamp-bg-1": "#26333d",
      "--wamp-bg-2": "#161f26",
      "--wamp-bg-3": "#0f161b",
      "--wamp-bar-1": "#36495a",
      "--wamp-bar-2": "#26333d",
      "--wamp-bar-3": "#1c2730",
      "--wamp-btn-1": "#2e4150",
      "--wamp-btn-2": "#1c2730",
      "--wamp-btn-text": "#a8cfe2",
      "--wamp-key-text": "#e6f4ff",
      "--wamp-lcd-1": "#0a141a",
      "--wamp-lcd-2": "#040a0e",
      "--wamp-edge-top": "#4a6678",
    },
    spectrum: ["#5fd0ff", "#bdf0ff", "#7ee0ff", "#3fb0e6", "#9ad8ff"],
  },
  crimson: {
    vars: {
      "--deck-accent": "#ff3b4e",
      "--wamp-cyan": "#ff7a86",
      "--wamp-yellow": "#ffae5c",
      "--wamp-dim": "#8a5560",
      "--wamp-muted": "#e0a0a8",
      "--wamp-text": "#ffd9dd",
      "--wamp-bg-1": "#2e1418",
      "--wamp-bg-2": "#1c0c0f",
      "--wamp-bg-3": "#130809",
      "--wamp-bar-1": "#4a1f26",
      "--wamp-bar-2": "#2e1418",
      "--wamp-bar-3": "#220e12",
      "--wamp-btn-1": "#3c181e",
      "--wamp-btn-2": "#220e12",
      "--wamp-btn-text": "#d0808a",
      "--wamp-key-text": "#ffd9dd",
      "--wamp-lcd-1": "#160709",
      "--wamp-lcd-2": "#0c0405",
      "--wamp-edge-top": "#5a2730",
    },
    spectrum: ["#ff3b4e", "#ff7a86", "#ffae5c", "#e0344a", "#ff5e6e"],
  },
} satisfies Record<ColorTheme, ThemePack>;

// Spectral ghost logo, inlined so the skin ships self-contained (no asset file).
const GHOST_MARK =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAyOCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBhcmlhLWhpZGRlbj0idHJ1ZSI+CiAgPHBhdGgKICAgIGQ9Ik0xNCAyQzguNDggMiA0IDYuNDggNCAxMnYxNGMwIDEuMjUgMS40NSAxLjk1IDIuNDMgMS4xN0w4IDI2Yy41Ny0uNDUgMS4zOC0uNDIgMS45MS4wOGwxLjQgMS4zMmMuNTUuNTIgMS40Mi41MiAxLjk3IDBsMS40LTEuMzJjLjUzLS41IDEuMzQtLjUzIDEuOTEtLjA4bDEuNTcgMS4xN0MyMC41NSAyNy45NSAyMiAyNy4yNSAyMiAyNlYxMmMwLTUuNTItNC40OC0xMC04LTEwWiIKICAgIGZpbGw9IiNiNDljZmYiCiAgLz4KICA8ZWxsaXBzZSBjeD0iMTAuNiIgY3k9IjEzIiByeD0iMS43IiByeT0iMi4zIiBmaWxsPSIjMWExMDMwIiAvPgogIDxlbGxpcHNlIGN4PSIxNy40IiBjeT0iMTMiIHJ4PSIxLjciIHJ5PSIyLjMiIGZpbGw9IiMxYTEwMzAiIC8+Cjwvc3ZnPgo=";

// Shared CRT treatment for graphic skins — pixel font + scanlines + bloom.
// Keyed off --deck-accent so each skin tints its own glow/fog. VT323 renders
// pixel-perfect where it's loaded (e.g. the hub), monospace otherwise.
const CRT: Record<string, string> = {
  "--deck-display-font": '"VT323", ui-monospace, monospace',
  "--deck-time-size": "1.1rem",
  "--deck-marquee-size": "0.78rem",
  "--deck-scanlines": "0.5",
  "--deck-glow": "0 0 32px -8px color-mix(in srgb, var(--deck-accent) 72%, transparent)",
  "--deck-fog":
    "radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--deck-accent) 24%, transparent), transparent 62%)",
};

export const THEMES: Record<DeckTheme, ThemePack> = {
  ...COLOR_THEMES,
  // Ghost — flagship graphic skin: violet bloom, bobbing ghost logo,
  // pixel-LCD readout, scanlines. Built on the vaporwave palette.
  ghost: {
    vars: {
      ...COLOR_THEMES.vaporwave.vars,
      ...CRT,
      "--deck-fog":
        "radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--deck-accent) 30%, transparent), transparent 60%), radial-gradient(100% 70% at 50% 120%, rgba(0,0,0,0.5), transparent 55%)",
      "--deck-mark-w": "17px",
      "--deck-mark-h": "18px",
      "--deck-mark-filter":
        "drop-shadow(0 0 4px color-mix(in srgb, var(--deck-accent) 75%, transparent))",
      "--deck-mark-anim": "deck-ghost-bob 3.2s ease-in-out infinite",
    },
    spectrum: COLOR_THEMES.vaporwave.spectrum,
    markSrc: GHOST_MARK,
  },
  // Terminal — green phosphor CRT.
  terminal: {
    vars: { ...COLOR_THEMES.green.vars, ...CRT },
    spectrum: COLOR_THEMES.green.spectrum,
  },
  // CRT Amber — amber monochrome monitor.
  "crt-amber": {
    vars: { ...COLOR_THEMES.amber.vars, ...CRT },
    spectrum: COLOR_THEMES.amber.spectrum,
  },
};
