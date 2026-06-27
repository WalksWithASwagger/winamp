// Curated theme packs for the modern deck. Each maps the `--wamp-*` tokens
// (defined in styles.css) and a matching spectrum palette. Distinct from .wsz
// classic skins — these reskin the modern <WinampPlayer />.

export type DeckTheme = "green" | "vaporwave" | "mono" | "amber";

export type ThemePack = {
  /** CSS custom-property overrides applied to the deck root. */
  vars: Record<string, string>;
  /** Spectrum analyzer bar colors. */
  spectrum: string[];
};

export const THEMES: Record<DeckTheme, ThemePack> = {
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
};
