# Contributing

This guide describes the current repository workflow on `origin/main`.
Commands below assume the repository root and the Node/pnpm versions recorded
by the repository.

## Toolchain

- Node.js 24.x, recorded in [`.nvmrc`](../.nvmrc) and the CI workflows.
- pnpm 10.28.2, recorded as `packageManager` in [`package.json`](../package.json).
- `ffmpeg` and `ffprobe` on `PATH` for the transmission media-gate tests and release check (locally verified with 8.1.2). CI installs the Ubuntu FFmpeg package.
- The workspace includes the root package and `examples/*`, including the
  `playground` package.

Check the active versions before installing:

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
```

The version checks should report Node 24.x and pnpm 10.28.2. The frozen
install keeps the committed `pnpm-lock.yaml` authoritative.

## Worktree-first workflow

Use a dedicated worktree for an issue or lane, especially when another
checkout may contain active or dirty work:

```bash
git status --short --branch
git worktree list
git worktree add .worktrees/<lane> -b codex/issue-<number>-<slug> origin/main
cd .worktrees/<lane>
git status --short --branch
```

Confirm the starting commit and branch before editing:

```bash
git rev-parse HEAD
git rev-parse origin/main
git log -1 --oneline
```

If the requested issue is tied to a particular `origin/main` commit, use that
exact commit as the worktree start point. Keep the primary checkout, other
issue worktrees, and unrelated lanes independent.

Preserve unrelated dirty work. A dirty status is ownership information, not an
invitation to reset, clean, stash, checkout, pull over, move, or delete files.
If the target lane is already dirty or overlaps another change, stop and
coordinate rather than hiding or repairing the work. Before handoff, report
the changed files and any pre-existing changes separately.

## Local development and checks

The root `package.json` is the command source of truth:

```bash
pnpm dev                 # tsup --watch
pnpm build               # build ESM, CJS, declarations, maps, and CSS into dist/
pnpm typecheck           # tsc --noEmit
pnpm test                # Vitest watch mode
pnpm test:run            # one Vitest pass
pnpm check:dist          # rebuild and fail if committed dist/ drifts
pnpm check:package       # verify package export targets are in the tarball
pnpm check:seo           # build the playground and run its SEO check
```

The focused playground commands come from
`examples/playground/package.json`:

```bash
pnpm --filter playground dev
pnpm --filter playground build
pnpm --filter playground preview
```

The playground resolves `@walkswithaswagger/winamp` through `workspace:*` and
therefore consumes the committed `dist/`. Run `pnpm dev` in another terminal
when source edits need to be reflected live. Its generated track collections
are refreshed by the checked-in script when that workflow is intended:

```bash
node examples/playground/scripts/sync-suno.mjs
```

Review generated or externally sourced changes before including them in an
issue. Do not hand-edit generated collections when the script is their source.

## Verification before handoff

For a library or playground change, run the relevant checks from a clean,
owned worktree. The baseline verification is:

```bash
git diff --check
pnpm typecheck
pnpm test:run
pnpm --filter playground build
```

Changes that affect source output should also run `pnpm check:dist`; changes to
package boundaries should run `pnpm check:package`; and changes to playground
metadata should run `pnpm check:seo`. `pnpm check:dist` writes generated files
before comparing them, so inspect its diff and keep unrelated generated work
out of the lane.

Before reporting completion, check both the patch and worktree state:

```bash
git diff --check
git status --short --branch
git diff --stat
git diff -- README.md docs/
```

Keep the handoff factual: list files changed, checks run, and any remaining
blockers. Do not describe planned, unverified, or merely screen-observed work
as shipped.
