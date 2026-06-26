# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `dev`, `typecheck`, and `check:dist` package scripts.
- GitHub Actions CI (typecheck + dist-drift guard) and tag-triggered npm release workflow.
- Vite demo playground under `examples/playground`.
- **`ClassicWinampPlayer`** — authentic Winamp 2 `.wsz` skin support (v1). Load
  any classic skin and get a pixel-faithful main window driven by the same
  `PlayerProvider`: parser (`parseSkin`/`useSkin`), `Sprite`/`SpriteButton`/
  `Slider` primitives, wired transport + position/volume sliders, NUMBERS time
  display, bitmap-font scrolling `Marquee`, and a viscolor-themed
  `ClassicVisualizer`. Sprite coordinates ported from webamp (MIT; see NOTICE).
  `fflate` is dynamic-imported so the modern deck doesn't bundle it.

## [0.1.0]

### Added

- Initial release: `PlayerProvider`, `WinampPlayer`, `usePlayer`, and the
  Butterchurn visualizer. Draggable, token-themed Winamp-style deck with a
  10-band Web Audio EQ, spectrum analyzer, playlist, windowshade, and 2× scale.

[Unreleased]: https://github.com/WalksWithASwagger/winamp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/WalksWithASwagger/winamp/releases/tag/v0.1.0
