# @walkswithaswagger/winamp

A draggable, skinnable **Winamp-style audio deck** for React — with a Milkdrop
(Butterchurn) visualizer, a real 10-band graphic EQ, a spectrum analyzer,
windowshade, 2× scale, a playlist, and a shareable now-playing state. A music
player and visualizer for your website. Themeable, framework-agnostic React,
zero app coupling.

## Install

```bash
npm install @walkswithaswagger/winamp
# peer deps:
npm install react react-dom
```

## Usage

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
    art: { palette: ["#f47a52"] },
  },
  // ...
];

function App() {
  return (
    <PlayerProvider
      tracks={tracks}
      onNowPlaying={({ bpm, accent }) => {
        /* optional: react to the playing track, e.g. drive an ambient scene */
      }}
    >
      <WinampPlayer />
      {/* your UI; descendants can call usePlayer() */}
    </PlayerProvider>
  );
}
```

`usePlayer()` exposes playback state + controls (`currentId`, `playing`, `time`,
`duration`, `analyser`, `eqGains`, `playTrack`, `cue`, `toggle`, `next`, `prev`,
`seek`, `setVolume`, `setEqGain`, …) to any descendant.

## Theming

Each track tints the deck via `--deck-accent` (set inline from
`track.art.palette[0]`). The rest of the chrome reads overridable tokens with
built-in defaults — set any of these on `:root` (or `.deck`) to re-skin:

| Token            | Default   | Used for               |
| ---------------- | --------- | ---------------------- |
| `--wamp-cyan`    | `#6dcad0` | LCD time readout       |
| `--wamp-yellow`  | `#fcd117` | playlist track numbers |
| `--wamp-dim`     | `#8c819b` | secondary labels       |
| `--wamp-muted`   | `#c8bdd7` | EQ presets, row text   |

`<WinampPlayer />` also takes `storageKey`, `wordmarkSrc`, `wordmarkText`, and
`spectrumColors` props to customize persistence + branding.

## Notes

- The components are `"use client"` — render them in a client boundary (works
  out of the box with the Next.js App Router).
- Butterchurn touches `window` at module scope, so the visualizer is a
  browser-only dynamic import (no SSR cost).
- Audio playback needs a user gesture (browser autoplay policy); `cue(id)`
  primes a track without playing, for deep links.

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

`examples/playground` is a Vite app for trying the deck locally:

```bash
pnpm --filter playground dev   # http://localhost:5173
```

Run `pnpm dev` alongside it to see live source edits. See its README for adding
audio.

## License

MIT © Kris Krüg
