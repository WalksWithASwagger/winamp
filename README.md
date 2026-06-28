# @walkswithaswagger/winamp

[![npm](https://img.shields.io/npm/v/@walkswithaswagger/winamp.svg)](https://www.npmjs.com/package/@walkswithaswagger/winamp) &nbsp;**[▶ Live demo](https://winamp-chi.vercel.app)**

A draggable, skinnable **Winamp-style audio deck for React** — one shared Web
Audio engine driving **two front-ends**:

- a **modern token-themed deck** (`WinampPlayer`) with a Milkdrop (Butterchurn)
  visualizer, a real 10-band graphic EQ, spectrum analyzer, playlist,
  windowshade, 2× scale, theme packs, and keyboard + OS media-key control; and
- an **authentic Winamp 2 classic-skin engine** (`ClassicWinampPlayer` + EQ &
  playlist windows) that renders real `.wsz` skins — including live skin
  switching from the [Winamp Skin Museum](https://skins.webamp.org).

Framework-agnostic React, zero app coupling. `"use client"`, Next.js App Router
friendly.

## Features

- 🎛 **Modern deck** — drag, windowshade, 2× scale, scrolling marquee, beat-pulsed
  transport, shareable now-playing state.
- 🎚 **Real 10-band EQ** (Web Audio peaking filters, ±12 dB) + preamp, with named
  presets.
- 📊 **Spectrum analyzer** + **Butterchurn/Milkdrop visualizer** with a preset
  picker (next / prev / shuffle).
- 🎨 **Theme packs** — `green` / `vaporwave` / `mono` / `amber`, or your own CSS
  tokens.
- ⌨️ **Keyboard shortcuts** + **MediaSession** (OS media keys & lock-screen
  metadata).
- 🪟 **Classic `.wsz` skins** — pixel-faithful main / EQ / playlist windows from
  any real Winamp 2 skin, with runtime switching.

## Install

```bash
npm install @walkswithaswagger/winamp
# peer deps:
npm install react react-dom
```

## Quick start (modern deck)

```tsx
import {
  PlayerProvider,
  WinampPlayer,
  type PlayerTrack,
} from "@walkswithaswagger/winamp";
import "@walkswithaswagger/winamp/styles.css";

const tracks: PlayerTrack[] = [
  {
    id: "1",
    number: 1,
    title: "Track One",
    person: "Artist",
    bpm: 100,
    audioUrl: "/audio/1.mp3",
    coverImage: "/art/1.jpg",
    art: { palette: ["#f47a52"] }, // first color tints the deck
  },
  // ...
];

function App() {
  return (
    <PlayerProvider tracks={tracks}>
      <WinampPlayer theme="vaporwave" />
      {/* any descendant can call usePlayer() */}
    </PlayerProvider>
  );
}
```

## The audio engine — `PlayerProvider` + `usePlayer()`

`PlayerProvider` owns the single `<audio>` element and the Web Audio graph
(`source → preamp → 10× EQ → analyser → balance → destination`, built lazily on
first play). Every UI in this library is just a view over it, so the modern and
classic decks can even run side-by-side off one provider.

```tsx
<PlayerProvider
  tracks={tracks}
  onNowPlaying={({ bpm, accent }) => {/* drive an ambient scene, etc. */}}
>
  {children}
</PlayerProvider>
```

`usePlayer()` (any descendant) returns:

| Group | Values / methods |
| ----- | ---------------- |
| State | `allTracks`, `currentId`, `playing`, `time`, `duration`, `volume`, `bpm`, `analyser` |
| EQ | `eqGains` (10× dB), `eqEnabled`, `preamp`, `setEqGain(band, db)`, `setEqGains(gains)`, `setEqEnabled(on)`, `setPreamp(db)` |
| Transport | `playTrack(id)`, `cue(id)`, `toggle()`, `next()`, `prev()`, `seek(t)` |
| Output | `setVolume(v)` (0–1), `balance`, `setBalance(-1..1)`, `shuffle`, `setShuffle(on)`, `repeat`, `setRepeat(on)` |

Exports `EQ_BANDS` (`[60,170,310,600,1000,3000,6000,12000,14000,16000]`) and
`EQ_MAX_DB` (`12`) — the classic Winamp 10-band layout.

## Modern deck — `<WinampPlayer>`

| Prop | Default | Description |
| ---- | ------- | ----------- |
| `theme` | — | `"green" \| "vaporwave" \| "mono" \| "amber"` token pack |
| `storageKey` | `"deckState"` | localStorage key for position/size/EQ preset |
| `wordmarkSrc` | — | logo image in the title bar |
| `wordmarkText` | `"ETHọ́S·FM"` | logo text |
| `spectrumColors` | theme/default | spectrum bar colors |

- **EQ presets:** Flat / Rock / Vocal / Bass / Treble / Classical / Dance /
  Loudness. The active preset highlights and persists; hand-tweaking a band
  clears it.
- **Visualizer:** Butterchurn, lazy-loaded (browser-only). Prev / Shuffle / Next
  preset controls; auto-cycles every 16 s, pausing while you navigate.

### Theming

Each track tints the deck via `--deck-accent` (from `track.art.palette[0]`). The
rest reads overridable `--wamp-*` tokens — set them on `:root` / `.deck`, or use
a `theme` pack (which sets them for you). Per-track accent always tints *over* a
theme. Key tokens:

| Token | Used for |
| ----- | -------- |
| `--deck-accent` | glow, play button, marquee, hovers |
| `--wamp-text` / `--wamp-key-text` | deck + transport text |
| `--wamp-bg-1/2/3` | deck background gradient |
| `--wamp-bar-1/2/3` | title bar gradient |
| `--wamp-btn-1/2` / `--wamp-btn-text` | window/EQ buttons |
| `--wamp-lcd-1/2` | LCD background |
| `--wamp-cyan` / `--wamp-yellow` / `--wamp-dim` / `--wamp-muted` | LCD time / numbers / labels |

`THEMES` (and `DeckTheme`, `ThemePack`) are exported if you want to read or
extend the packs.

### Keyboard shortcuts

`WinampPlayer` attaches them automatically. For a custom UI, attach the hook
yourself (inside `PlayerProvider`):

```tsx
import { usePlayerKeyboardShortcuts } from "@walkswithaswagger/winamp";
usePlayerKeyboardShortcuts({ seekStep: 5, volumeStep: 0.05 });
```

Space = play/pause · ←/→ = seek ±5 s · ↑/↓ = volume ±5%. Ignored while a form
field is focused; opt out with `{ enabled: false }`.

### OS media keys

`PlayerProvider` wires the **MediaSession API** automatically (feature-detected):
lock-screen / hardware media keys map to play/pause/prev/next/seek, with
title / artist / artwork metadata from the current track.

## Classic `.wsz` skins

Render authentic Winamp 2 skins, driven by the same `PlayerProvider`:

```tsx
import {
  PlayerProvider,
  ClassicWinampPlayer,
  ClassicEqWindow,
  ClassicPlaylistWindow,
  skinMuseumUrl,
} from "@walkswithaswagger/winamp";

<PlayerProvider tracks={tracks}>
  <ClassicWinampPlayer skinUrl="/skins/base.wsz" scale={2} />
  <ClassicEqWindow skinUrl="/skins/base.wsz" scale={2} />
  <ClassicPlaylistWindow skinUrl="/skins/base.wsz" scale={2} />
</PlayerProvider>;
```

- **`ClassicWinampPlayer`** — main window: transport, position/volume/balance
  sliders, NUMBERS time, bitmap-font marquee, viscolor spectrum, shuffle/repeat,
  windowshade (title-bar button) + double-size (double-click title bar),
  persisted under `storageKey`.
- **`ClassicEqWindow`** — 10-band EQ + preamp + on/off + curve graph (1:1 with
  the engine's `EQ_BANDS`).
- **`ClassicPlaylistWindow`** — track list in `pledit.txt` colors; click a row to
  play.

Each takes `skinUrl` (reactive — change it to switch skins at runtime) and
`scale`. Skins parse asynchronously and **never throw into the tree** (failures
surface as a status).

**Loading skins.** Any CORS-enabled `.wsz` URL works. For the Skin Museum:

```tsx
<ClassicWinampPlayer skinUrl={skinMuseumUrl("5e4f10275dcb1fb211d4a8b4f1bda236")} />
```

**Lower-level building blocks** (also exported): `useSkin(url)` →
`{ skin, status }`, `parseSkin(arrayBuffer)`, `SkinProvider` / `useSkinContext`,
`Sprite` / `SpriteButton` / `Slider`, `SKIN_SPRITES` / `SPRITE_DIMS`. `fflate`
(the unzip dep) is **dynamic-imported**, so the modern deck never bundles it.

> **Licensing:** the original Winamp skin is Nullsoft-copyrighted and is **not**
> bundled — supply your own `skinUrl` (the Skin Museum is a good source). Classic
> sprite coordinates are ported from [Webamp](https://github.com/captbaritone/webamp)
> (MIT); see [`NOTICE`](./NOTICE).

## Notes

- Components are `"use client"` — render in a client boundary (Next.js App Router
  works out of the box).
- The Butterchurn visualizer and the `.wsz` engine touch `window` / canvas, so
  they're browser-only dynamic imports (no SSR cost).
- Audio playback needs a user gesture (autoplay policy); `cue(id)` primes a track
  without playing, for deep links.

## Develop

```bash
pnpm install
pnpm dev         # tsup --watch — rebuild dist/ on change
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest (watch); pnpm test:run for a single pass
pnpm build       # tsup → dist/ (ESM + CJS + types) + styles.css
pnpm check:dist  # rebuild and fail if committed dist/ drifts from src/
```

`dist/` is committed so the package installs directly from git; `check:dist`
(also run in CI) guards it against drifting out of sync with `src/`.

### Playground

`examples/playground` is a Vite app exercising both decks — theme switcher,
classic windows, and a live `.wsz` skin picker:

```bash
pnpm --filter playground dev   # http://localhost:5173
```

## License

MIT © Kris Krüg · classic sprite data ported from Webamp (MIT, see `NOTICE`).
