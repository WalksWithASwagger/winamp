# Transmission 001

Issue [#73](https://github.com/WalksWithASwagger/winamp/issues/73) implements the approved finite listening edition. This is an on-demand programme, with three visual chapters and a short artist-note detour. It does not implement a broadcast schedule or simultaneous mixing.

## Current release gate

`examples/playground/public/transmission-001.json` deliberately contains `{"release": null}`. The approved programme master, creator recording, transcript, final credits and chapter timings have not been supplied. The route shows a preparation state with no audio element or dead Play button. Do not mark the release complete or replace the missing creator recording with synthetic speech or another song.

`pnpm check:transmission` exits nonzero until the release manifest and its local assets are supplied. This is a separate **content release gate**, not a substitute for CI, listening, or approval. Keep the PR in draft while it is unresolved. Automated interaction tests use clearly labelled synthetic fixtures outside the production manifest.

To finish this same slice:

1. Add the approved programme master (up to 300 seconds) and a distinct 15–30-second artist recording under `examples/playground/public/audio/`, with versioned filenames. Keep existing song files intact.
2. Populate the manifest’s `release` using `TransmissionRelease` in `examples/playground/src/transmission/score.ts`: `audioUrl`, `duration`, `credits`, exactly three `chapters` (`at`, `title`, `image`, `alt`), and `note` (`audioUrl`, `duration`, `transcript`, `credits`). Times are seconds. The first chapter starts at zero; later chapters increase and stay below the programme duration. Use actual measured durations and approved credits.
3. Use first-party `/audio/` media and `/art/` images. The existing three covers are available, but their mapping and chapter titles require review against the final edit. After public release, keep the Transmission 001 timeline immutable so existing moment links retain their meaning. Versioned audio filenames alone do not make a changed timeline compatible.
4. Run `pnpm check:transmission`, verify actual decoded durations and seekability, listen through both assets, and update the preparation status in `public/llms.txt`.
5. Perform the device and listener checks below. Merge and deployment require their own authorization.

## Interaction contract

The manifest is loaded from `/transmission-001.json`; it is static data, not a CMS or API service. A malformed/unreachable manifest yields a visible reload/back message. An unapproved manifest yields the preparation state.

A ready edition owns one mounted `PlayerProvider` with `transportMode="single"`. The library’s default playlist behavior is unchanged. Single mode stops on end, ignores repeat and makes next/previous actions inert, including OS track navigation. `onTrackEnded(trackId)` lets the app show its completion state.

Opening `/transmission-001?t=12` cues at 12 seconds without autoplay. Finite timestamps clamp to the programme duration; malformed values become zero. Seek restoration waits for source metadata. Chapter imagery follows media time, not a wall-clock timer or `onNowPlaying`.

Hear the artist saves the programme’s position and play/pause intent, then selects the note in the same audio element. Return restores both. Ending the note leaves it selected with Return available. Keyboard focus follows the detour and returns to its entry button. Copy this moment uses whole programme seconds even while the note is playing; denied clipboard access offers a selectable link.

The artist note is always available as a transcript. Static mode and reduced-motion preference remove chapter animation. OS play/pause actions are idempotent. Pause pins the current media position because WebKit’s Web Audio media clock can otherwise revert to its last seek; this was reproduced with native elements outside React, with WAV and MP3, in both headed and headless WebKit. A media error keeps the selected source and its place; Retry repeats the prior intent without silently advancing.

Playback events also check the element’s paused state: WebKit can deliver a queued `playing` event after a paused programme has been restored. This must not change the bookmark’s intent on the next detour.

## Verification

From the owned worktree:

```sh
pnpm typecheck
pnpm exec tsc --noEmit -p examples/playground/tsconfig.json
pnpm test:run
pnpm build
pnpm check:package
pnpm check:seo
pnpm test:e2e
pnpm check:transmission
git diff --check
```

Include generated library `dist/` in the patch; `pnpm check:dist` must pass once the intended generated changes are staged/committed. The playground consumes the package’s built output, so rebuild after provider edits before testing the application.

CI verifies both TypeScript configurations, unit tests, generated output, packaging, three-page SEO, existing Chromium smoke tests, and transmission tests in Chromium and WebKit. Browser fixtures serve seekable byte ranges; they verify advancing media time, pause, seek, return intent, replay, failure/retry, one audio element, keyboard focus, 390px layout, 200% CSS zoom, and reduced motion. Synthetic fixture results do not establish listening quality or content approval.

Before release, verify iOS Safari interruption/background/return behavior on a real device and make a full audible pass through the approved programme and note. Target four of five listeners starting within ten seconds and entering/leaving the note unaided. Record unavailable checks as unavailable, not passed.

## Exclusions

No scheduling, cross-device synchronization, parallel audio mixing, generative media, accounts, telemetry, CMS/backend, persistent listening history, station/playlist redesign, existing skin/visualizer removal, dependency upgrades, or npm release work belongs to this slice.
