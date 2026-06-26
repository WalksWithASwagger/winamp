# Playground

Local dev harness + showcase for `@walkswithaswagger/winamp`.

## Run

From the repo root:

```bash
pnpm install
pnpm --filter playground dev
```

The app imports the library via the workspace (`workspace:*`), resolving to the
committed `dist/`. To see live source edits, run the library in watch mode in a
second terminal:

```bash
pnpm dev        # tsup --watch, at the repo root
```

## Adding audio

`src/tracks.ts` seeds three collections (Ethos Labs, Both Hands Full, AI Blues)
with placeholder entries. To make them play:

1. Drop MP3s in `public/audio/` and cover art in `public/art/`.
2. Set `audioUrl: "/audio/<file>.mp3"` and `coverImage: "/art/<file>.jpg"` on
   each track, and fill in real titles + BPM.

Local files under `public/` are same-origin, so the Web Audio analyser (used by
the spectrum + Butterchurn visualizer) works without CORS configuration.
