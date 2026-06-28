# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
