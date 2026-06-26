# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `dev`, `typecheck`, and `check:dist` package scripts.
- GitHub Actions CI (typecheck + dist-drift guard) and tag-triggered npm release workflow.
- Vite demo playground under `examples/playground`.
- Classic `.wsz` skin engine foundation (Ph1): `parseSkin`, `useSkin`,
  `SkinProvider`/`useSkinContext`, and `Sprite`/`SpriteButton` primitives, with
  ported main-window sprite coordinates. Parses real Winamp 2 skins
  (unzip → BMP decode → sprite data-URIs). `fflate` is a dynamic-imported
  dependency so the modern deck doesn't pay for it.

## [0.1.0]

### Added

- Initial release: `PlayerProvider`, `WinampPlayer`, `usePlayer`, and the
  Butterchurn visualizer. Draggable, token-themed Winamp-style deck with a
  10-band Web Audio EQ, spectrum analyzer, playlist, windowshade, and 2× scale.

[Unreleased]: https://github.com/WalksWithASwagger/winamp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/WalksWithASwagger/winamp/releases/tag/v0.1.0
