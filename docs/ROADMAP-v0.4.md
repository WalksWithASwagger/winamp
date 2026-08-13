# v0.4 player API roadmap

Status: proposal only. This document records the first bounded v0.4 feature
contract from issue [#54](https://github.com/WalksWithASwagger/winamp/issues/54).
It does not claim that the proposed API or behavior ships today.

## Audit basis

The audit was performed against the issue's base commit, `443794d`, and the
current source, playground, README, and tests.

| Surface | Current evidence | Constraint for v0.4 |
| --- | --- | --- |
| `src/types.ts` | `PlayerTrack` is deliberately small; `audioUrl` is optional, so a track can be listed but not played. | Keep track data app-owned and do not turn it into a fetch/service model. |
| `src/PlayerProvider.tsx` | One shared hidden `<audio>` element owns transport. `cue`, `playTrack`, `toggle`, `next`, and `prev` mutate it; the provider listens to time, duration, play, pause, and ended events. `play()` promises are currently discarded and there is no public load/error state. | Extend the existing context boundary additively. Do not add a second playback engine. |
| `src/WinampPlayer.tsx` | The modern deck consumes `usePlayer()`, persists layout/EQ under `storageKey`, and uses `?track=<id>` for cue/share state. Rows disable tracks without `audioUrl`. | Status must be visible in the existing deck/list surfaces without changing the URL or persistence contract. |
| `src/classic/` | Classic main, EQ, and playlist windows consume the same provider. `useSkin()` already exposes `loading`/`ready`/`error`; classic `data-*-status` attributes describe skin loading, not audio loading. | Keep player status distinct from skin status and make it available to both classic windows without new skin assets. |
| `examples/playground` | The demo mixes local audio with remote Suno CDN audio and drives both modern and classic players from the same tracks. | Do not make the demo or verification depend on third-party availability. |
| `test/` | Vitest/Testing Library stubs Web Audio and media playback. Provider tests cover clamping and stepping, but not media load, buffering, rejected play promises, or media errors. | Add deterministic unit coverage and a browser check for real media events in the follow-up implementation. |

## Candidate comparison

| Candidate | User value and repository evidence | Public API impact | Browser/runtime risk | Testability and scope | Decision |
| --- | --- | --- | --- | --- | --- |
| Queue management | A richer queue would make the existing playlist actionable. Today `tracks` is an immutable provider prop, `playable` is derived from it, and stepping is computed directly from that list. | High: queue identity, ordering, mutation, current index, shuffle history, and likely playlist actions. | Medium-high: queue changes during playback, removed current tracks, repeat/shuffle semantics, and deep-link identity all need rules. | Testable, but it crosses provider, modern playlist, classic playlist, and URL semantics. | Defer. |
| Persisted playback preferences and last-track state | Returning users reasonably expect volume, shuffle/repeat, and the last selected track to survive reloads. Existing persistence is split: modern layout/EQ uses a merged `storageKey`; classic windows persist chrome state with `usePersistedState`; provider playback state is ephemeral. | Medium-high: storage ownership, schema/versioning, hydration timing, multiple-player isolation, and possibly a provider `storageKey` contract. | Medium: SSR/localStorage timing, stale track IDs, privacy expectations, and autoplay restrictions. | Unit-testable, but needs migration and deep-link precedence decisions before implementation. | Defer. |
| Richer remote track loading/error state | The public track model permits remote URLs, but `playTrack`/`cue` expose no load status, `play()` rejection is unobserved, and failed media is otherwise indistinguishable from a stopped player. `useSkin()` proves the repository already uses explicit async status/error states. | Low-medium: three public types plus three additive `usePlayer()` fields/actions; no new provider prop or hook required. | Medium but contained: native media events, buffering, and autoplay/rejected promises vary by browser. No new network client is needed. | High: deterministic event dispatches cover the provider; Chromium smoke can verify actual local media behavior. | **Recommend as the first slice.** |

## Recommended slice: observable remote playback readiness and failure

Add a small, provider-owned status machine for the currently selected track.
It should describe whether the shared audio element is loading, ready, playing,
paused, or failed, and give the host a bounded retry action. The feature is
about observability and recovery of one selected source, not about choosing a
different source or managing a queue.

### Proposed public contract

These are proposed symbols for the follow-up implementation; they are not
exported by this documentation-only change.

```ts
export type PlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "error";

export type PlaybackErrorCode = "load" | "play";

export interface PlaybackError {
  trackId: string;
  code: PlaybackErrorCode;
}
```

`usePlayer()` would gain:

```ts
playbackStatus: PlaybackStatus;
playbackError: PlaybackError | null;
retry: () => void;
```

`PlayerProvider` props remain unchanged. No new hook is needed: the existing
`usePlayer()` hook is already the public observation point. The implementation
follow-up should export the three types from `src/index.ts` alongside
`PlayerTrack` and `NowPlaying`, while keeping the existing `playing` boolean
for compatibility and convenience. This roadmap PR intentionally changes no
exports.

### Symbol validation against the current API

This audit checked each proposed name against `src/index.ts`, `src/types.ts`,
and the private `PlayerValue` shape in `src/PlayerProvider.tsx`:

| Proposed reference | Current status | Follow-up consequence |
| --- | --- | --- |
| `PlayerTrack.id` / `PlaybackError.trackId` | `PlayerTrack.id` already exists and is a string. | Reuse the existing track identity; do not add a second ID type. |
| `usePlayer()` | Already exported from `src/index.ts`. | Add fields to its returned context value; do not add a parallel hook. |
| `PlayerProvider` | Already exported; current props are `tracks`, optional `onNowPlaying`, and `children`. | Keep props unchanged for this slice. |
| `PlaybackStatus`, `PlaybackErrorCode`, `PlaybackError` | Not present in current exports or types. | Add and export only in the implementation follow-up. |
| `playbackStatus`, `playbackError`, `retry` | Not present in the current private `PlayerValue`. | Add them additively; do not rename or remove `playing`, `cue`, or transport actions. |

No proposed symbol is represented as an existing API in this document.

The error contract intentionally carries a stable code and track ID rather
than a native `MediaError`, exception object, or URL. Browser-native messages
are inconsistent and may expose source details; the UI can map `load` and
`play` to friendly copy.

### State transitions

| Event | Result | Required behavior |
| --- | --- | --- |
| Provider mounts with no current track | `idle`, no error | Preserve the current initial state. |
| Valid `cue(id)` or new `playTrack(id)` | `loading`, error cleared | Set the source and current ID as today. `cue` remains non-autoplaying. |
| Media becomes sufficiently playable (`canplay`/equivalent) while cued | `ready` | A cued track is ready but not playing. |
| The element emits `play` | `playing` | Keep `playing === true`. |
| The element emits `pause` for the current source | `paused` | Keep `playing === false`; do not treat an ordinary pause as an error. |
| `waiting`/`stalled` for the current source | `loading` | Treat this as transient buffering; return to `playing` on the next `play`/usable-media event. |
| Native media `error` | `error` with code `load` | Keep the selected track and stop the transport; do not auto-advance. |
| `HTMLMediaElement.play()` rejects | `error` with code `play` | Observe the rejection; do not create an unhandled promise rejection. |
| `retry()` with a current track | `loading`, error cleared | Reuse the current track's URL and attempt loading/playing according to the prior intent. |
| `next`, `prev`, repeat, or shuffle chooses another track | New track enters `loading` | Preserve current stepping rules; a failed track is not silently skipped in this slice. |
| Invalid ID or track without `audioUrl` | No state change | Preserve the current no-op behavior and disabled playlist rows. |

The implementation must guard events from an old source so a late error or
`canplay` event cannot overwrite the status of a newer selection. `duration`
and `time` keep their existing meanings. `playing` remains the compatibility
boolean rather than becoming a second, independently managed state machine.

### UI touchpoints

Modern `WinampPlayer` should add a small status surface to the existing LCD or
playlist drawer:

- `loading`/buffering tells the user that the selected remote track is being
  prepared, without pretending that playback has started.
- `error` shows stable, human-readable load/play copy and a `Retry` action.
- The selected row remains selected and is not silently replaced by another
  row. Existing disabled behavior for tracks without `audioUrl` remains.
- The status is exposed through a native live/status element with a stable
  accessible name so the accessibility work in issue [#52](https://github.com/WalksWithASwagger/winamp/issues/52)
  can test it without relying on color, animation, or pixel imagery.

Classic main and playlist windows should consume the same context fields. They
may use their existing stopped indicator, marquee/title area, and playlist row
to show the state, but must provide a non-image accessible status and retry
control where the skin has no suitable asset. `data-skin-status` must continue
to describe `.wsz` loading only; a separate player-status hook/attribute may be
added by the implementation if a stable browser test locator is necessary.
No EQ, visualizer, theme, or skin-parser changes belong in this slice.

The playground needs only enough wiring to demonstrate the shared status on a
local deterministic source or test fixture. It must not make a live Suno CDN or
Skin Museum request part of the correctness proof.

### Persistence and deep-link implications

- Do not persist `playbackStatus`, `playbackError`, buffering, or retry intent.
  They are transient and must reset on mount.
- Do not add `lastTrack`, position, volume, shuffle, or repeat persistence in
  this slice. Existing `storageKey` behavior in `WinampPlayer` and classic
  windows remains unchanged.
- Keep `?track=<id>` as the only playback deep-link parameter. A valid deep
  link still cues without autoplay; it transitions through `loading` to
  `ready`, or to `error` if the source cannot load.
- A failed deep-linked track remains the selected `currentId`, so a copied link
  still identifies the user's intended track. Retry does not rewrite the URL.
- Do not add URL parameters for status, errors, retries, queue order, or
  playback position.

### Failure behavior

The provider must fail closed at the media boundary: invalid/unplayable track
IDs remain no-ops; native load failures become observable state; rejected play
promises are caught; and no failure automatically jumps to another track.
Retry is explicit. If localStorage is unavailable, nothing in this slice
changes the existing non-fatal persistence behavior because this feature does
not add storage.

### Follow-up acceptance criteria

The implementation issue should be considered complete only when all of the
following are true:

- [ ] `PlaybackStatus`, `PlaybackErrorCode`, and `PlaybackError` are exported
      from the package, and their names/types match this contract.
- [ ] `usePlayer()` exposes `playbackStatus`, `playbackError`, and `retry`
      without removing or changing existing fields and actions.
- [ ] Valid cue, play, pause, buffering, native media error, rejected play,
      retry, next/prev, repeat, shuffle, and invalid/unplayable paths have
      deterministic provider tests.
- [ ] A stale event from a prior source cannot replace the current source's
      status or error.
- [ ] Modern and classic player surfaces expose loading and failure state with
      stable accessible names/roles, and explicit retry does not silently
      advance the track.
- [ ] `?track=<id>` remains cue-only and compatible with existing share links;
      transient playback status is not persisted.
- [ ] Chromium browser smoke coverage uses a local test-owned audio source and
      verifies user-initiated playback, a failed source, and retry without
      depending on third-party CDN or skin availability. This follows issue
      [#38](https://github.com/WalksWithASwagger/winamp/issues/38)'s browser
      boundary: Chromium first, failure artifacts only, no visual snapshot
      suite.
- [ ] The existing accessibility interaction coverage from issue #52 remains
      valid for transport, sliders, playlist rows, and the new status/retry
      control.

### Verification for the follow-up implementation

Run the repository checks plus the browser lane when it exists:

```sh
git diff --check
pnpm typecheck
pnpm test:run
pnpm --filter playground build
pnpm test:e2e
```

The first four commands are the current repository gate for this roadmap
change. `pnpm test:e2e` is a follow-up requirement owned by the real-browser
smoke lane; until that command exists, the implementation must document the
equivalent browser evidence rather than claiming it passed.

## Explicit non-goals

This slice does not include:

- queue creation, reorder, remove, persistence, queue history, or a playlist
  service;
- automatic skip/fallback after a media failure;
- a new fetch client, backend, CMS, hosted playlist, authentication, analytics,
  caching, offline storage, or service worker;
- last-track, position, volume, EQ, shuffle, or repeat persistence;
- new query parameters or autoplay behavior;
- a state-management library or rewrite of `PlayerProvider`;
- a visual redesign, new skin assets, or a second audio element;
- package-version changes, release work, or unrelated export changes in this
  discovery lane.

Queue semantics and persistence can be reconsidered after this status contract
is stable and tested across both player surfaces.
