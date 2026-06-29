# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Graphic deck skins** — the modern-deck `theme` system now carries imagery, a
  pixel-LCD display font, CRT scanlines, atmosphere fog, and tunable glow via new
  opt-in `--deck-*` CSS hooks (palette themes render unchanged). Three ship:
  `ghost` (bobbing logo + violet bloom + cyan readout), `terminal` (green
  phosphor), and `crt-amber`. `ThemePack` gains optional `markSrc`; new
  `ColorTheme` / `GraphicSkin` types alongside `DeckTheme`. Optional
  `@walkswithaswagger/winamp/skins.css` bundles the pixel-LCD font (VT323 latin
  subset, embedded data-URI, OFL — see NOTICE), kept out of `styles.css` so
  palette-only consumers pay nothing.
- Three more modern-deck theme packs — `sunset`, `ice`, `crimson` (7 total).
- Window-shade for the classic **EQ** and **playlist** windows (double-click the
  title bar); all three classic windows now shade, persisted per window.

### Changed

- `WinampPlayer` renders the title-bar logo `<img>` only when `wordmarkSrc` is
  provided (default is now `undefined`, not a private asset path).

### Demo / site

- Live demo on Vercel (auto-deploys from `main`): https://winamp-chi.vercel.app
- **[ghost.radio.fm](https://ghost.radio.fm)** — Kris's audio/music hub built on the
  playground (Netlify-hosted; Vercel can't take `*.radio.fm` because `radio.fm` isn't on
  the Public Suffix List). Floating deck + setlist, project/GitHub blurb, dial-preset links
  to other releases, and the classic `.wsz` booth.
- The hub defaults to the **`ghost`** deck skin and ships a grouped skin / color-theme
  picker (loads VT323 so the pixel-LCD readout renders crisp).
- Default **Gorgeous Ghost** collection with real audio + cover art (extracted
  from the tracks) driving artwork + per-track deck tinting.

## [0.2.0]

### Added

- `dev`, `typecheck`, and `check:dist` package scripts.
- GitHub Actions CI (typecheck + dist-drift guard) and tag-triggered npm release workflow.
- Vite demo playground under `examples/playground`.
- **Authentic Winamp 2 `.wsz` classic-skin engine** — load any classic skin and
  get pixel-faithful windows driven by the same `PlayerProvider`:
  - `ClassicWinampPlayer` — main window: transport, position/volume/balance
    sliders, NUMBERS time, bitmap-font scrolling `Marquee`, viscolor
    `ClassicVisualizer`, shuffle/repeat, plus window-shade + double-size
    (persisted).
  - `ClassicEqWindow` — 10-band EQ (1:1 with `EQ_BANDS`) + preamp, on/off, graph.
  - `ClassicPlaylistWindow` — track list with pledit.txt colors, click-to-play.
  - Engine extensions on `PlayerProvider` (additive, back-compatible): `preamp`,
    `eqEnabled`, `balance`, `shuffle`, `repeat`.
  - Building blocks: `parseSkin`/`useSkin`, `SkinProvider`, `Sprite`/
    `SpriteButton`/`Slider`, and `skinMuseumUrl` for the Winamp Skin Museum.
  - Sprite coordinates ported from webamp (MIT; see NOTICE). `fflate` is
    dynamic-imported so the modern deck never bundles it.
- **Modern-deck feature pack:**
  - Visualizer preset picker — Prev / Shuffle / Next + name label; auto-cycle
    pauses while navigating.
  - EQ presets expanded to 8 (Flat/Rock/Vocal/Bass/Treble/Classical/Dance/
    Loudness); active preset highlights and persists.
  - Theme packs — `theme` prop (`green`/`vaporwave`/`mono`/`amber`) over a
    tokenized `--wamp-*` palette; exported `THEMES`.
  - `usePlayerKeyboardShortcuts()` — Space / arrow-key media control (exported,
    focus-aware, configurable).
  - MediaSession API — OS media keys + lock-screen metadata, in `PlayerProvider`.

## [0.1.0]

### Added

- Initial release: `PlayerProvider`, `WinampPlayer`, `usePlayer`, and the
  Butterchurn visualizer. Draggable, token-themed Winamp-style deck with a
  10-band Web Audio EQ, spectrum analyzer, playlist, windowshade, and 2× scale.

[Unreleased]: https://github.com/WalksWithASwagger/winamp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/WalksWithASwagger/winamp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/WalksWithASwagger/winamp/releases/tag/v0.1.0
