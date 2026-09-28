# Agent instructions — winamp

This file is the front door for coding agents in
[`WalksWithASwagger/winamp`](https://github.com/WalksWithASwagger/winamp).
Read it before editing. Deeper maps live in
[`README.md`](./README.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
[`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md),
[`docs/AGENTIC-DELIVERY.md`](./docs/AGENTIC-DELIVERY.md), and
[`docs/TRANSMISSION-001.md`](./docs/TRANSMISSION-001.md). Recent merged work is
in [`CHANGELOG.md`](./CHANGELOG.md).

## Purpose and Authority

`@walkswithaswagger/winamp` is a React audio-deck library: one `PlayerProvider`
Web Audio engine, a modern token-themed `WinampPlayer`, and a classic Winamp 2
`.wsz` skin engine (`ClassicWinampPlayer` plus EQ and playlist windows). It is
client-only (`"use client"`), framework-agnostic, and published as
`@walkswithaswagger/winamp` on npm.

The playground under `examples/playground` is the live harness and public site
(Ghost Radio). It is not a second player engine.

- Library source of truth: `src/` (public surface is `src/index.ts`).
- Built package output: committed `dist/` (what npm and the playground import).
- Issue/PR delivery rules: [`agentic/contract.json`](./agentic/contract.json).
- Review and merge stay human unless a later instruction says otherwise.

This file does not replace the issue contract. If an assigned issue and this
file conflict, stop and name the conflict rather than guessing.

## Capability Ownership

| Surface | Owns | Does not own |
| --- | --- | --- |
| `src/PlayerProvider.tsx` + `src/types.ts` | Shared audio element, Web Audio graph, `usePlayer()` | Host track catalogs, remote media hosting |
| `src/WinampPlayer.tsx` + `src/modernDeck/` | Modern deck UI | Classic `.wsz` rendering |
| `src/classic/` | `.wsz` parse/render and classic windows | A second audio engine |
| `src/index.ts` | Public JS/TS export list | Unpublished internals |
| `examples/playground` | Demo site, track collections, Transmission 001 host UI | Library internals |
| `scripts/` | Package, SEO, transmission, and agentic helpers | Product features |
| `agentic/contract.json` | Intake/verification contract | GitHub write automation |

### Repo layout

```
src/                     library implementation
src/classic/             .wsz engine and classic windows
src/modernDeck/          modern deck panels
dist/                    committed ESM + CJS + types + CSS
examples/playground/     Vite demo / ghost.radio.fm hub
test/                    Vitest unit tests
test/e2e/                Playwright (Chromium; WebKit for transmission/proof)
scripts/                 check/build/transmission + agentic Python tools
docs/                    architecture, contributing, transmission, roadmap
agentic/                 machine-readable delivery contract
.github/workflows/       CI on push/PR; npm publish on v* tags
```

The pnpm workspace is the root package plus `examples/*`
(`pnpm-workspace.yaml`).

### Deploy targets

- Playground / live demo: Vercel at https://winamp-chi.vercel.app (`vercel.json`,
  auto-deploys from `main`).
- Ghost Radio hub: Netlify at https://ghost.radio.fm (`netlify.toml` builds
  `pnpm --filter playground build` into `examples/playground/dist`).
- npm: `@walkswithaswagger/winamp`. Tag-triggered trusted publishing is
  documented in [`RELEASING.md`](./RELEASING.md). Do not publish from an agent
  session.

## Routing and Context Loading

**Stack (verified in repo files):** Node 24 (`.nvmrc` + CI), pnpm 10.28.2
(`packageManager` in `package.json`), TypeScript, tsup, Vitest + jsdom, Playwright,
React 19 as a peer, Butterchurn + fflate + framer-motion as runtime deps. The
playground is Vite 6. Transmission media gates need `ffmpeg` and `ffprobe` on
`PATH`.

Load context in this order:

1. This file, then the issue body (required sections in
   `docs/AGENTIC-DELIVERY.md`).
2. `README.md` for the public API and consumer usage.
3. `docs/ARCHITECTURE.md` for provider / view / skin / dist boundaries.
4. `docs/CONTRIBUTING.md` for worktrees, commands, and handoff.
5. `docs/TRANSMISSION-001.md` when the change touches `/transmission-001` or
   release media.

Worktree-first, one issue per worktree, branch
`codex/issue-<number>-<slug>` from `origin/main` under `.worktrees/` (see
`agentic/contract.json`). This cloud checkout may already be on a dedicated
branch; do not reset, stash, or clean someone else's dirty tree.

An issue is executable only with `agent:ready` and the six sections
`Context`, `Acceptance Criteria`, `Tests/Evals`, `Verification`,
`Agent Instructions`, and `Out of Scope`. Stop labels: `blocked`,
`needs-human`, `needs-decision`. Those must never be combined with
`agent:ready`.

## Verification

Only commands that exist in `package.json`, `examples/playground/package.json`,
or checked-in scripts. There is no Makefile.

Install (from repo root):

```bash
node --version          # expect 24.x
pnpm --version          # expect 10.28.2
pnpm install --frozen-lockfile
```

Library:

```bash
pnpm dev                # tsup --watch → dist/
pnpm build              # tsup + CSS copy + use-client restore
pnpm typecheck          # tsc --noEmit
pnpm test               # Vitest watch
pnpm test:run           # one Vitest pass
pnpm test:e2e           # Playwright (needs Chromium; WebKit for transmission/proof)
pnpm check:dist         # rebuild and fail if committed dist/ drifted
pnpm check:package      # export targets present in the tarball
```

Playground:

```bash
pnpm --filter playground dev      # http://localhost:5173
pnpm --filter playground build
pnpm --filter playground preview
pnpm check:seo                    # playground build + scripts/check-seo.mjs
pnpm exec tsc --noEmit -p examples/playground/tsconfig.json
```

The playground imports `workspace:*` and therefore reads committed `dist/`.
Run `pnpm dev` in a second terminal when source edits must show up live.

Transmission (content gate is separate from CI merge; see
`docs/TRANSMISSION-001.md`):

```bash
pnpm check:transmission
pnpm prepare:transmission
pnpm preview:transmission
```

`pnpm check:transmission` is expected to fail while
`examples/playground/public/transmission-001.json` is `{"release": null}`.
Do not treat that failure as a library regression, and do not invent release
media to make it pass.

Agentic helpers (Python stdlib only):

```bash
python3 scripts/agentic/issue_lint.py --issue-file path/to/issue.json --labels agent:ready
python3 -m unittest discover -s scripts/agentic/tests -p 'test_*.py'
python3 scripts/agentic/status_report.py --offline scripts/agentic/tests/fixtures/status.json
```

Track collections are regenerated only with the checked-in script, then
reviewed — do not hand-edit generated collections when that script is the
source:

```bash
node examples/playground/scripts/sync-suno.mjs
```

Baseline before handoff (from `docs/CONTRIBUTING.md`):

```bash
git diff --check
pnpm typecheck
pnpm test:run
pnpm --filter playground build
```

Add `pnpm check:dist` when `src/` or CSS output changed, `pnpm check:package`
when package exports changed, `pnpm check:seo` when playground metadata
changed, and `pnpm test:e2e` when browser behavior changed. `pnpm check:dist`
rewrites `dist/` before comparing; inspect that diff and keep unrelated
generated files out of the lane.

Report commands run, results, commands skipped, and why. Do not describe
unverified work as shipped.

## Safety and Human Gates

### Secrets

This repo has **no** committed `.env.schema`. `.gitignore` ignores `.env*`.
Env values, when needed, are managed with Varlock (`.env.schema` +
`varlock run`) or Cursor Cloud secrets. List names only. Never write a real
value into a file, issue, log, or PR.

Env names that appear in this repo today:

- `CI` — Playwright (`forbidOnly`, retries) in `playwright.config.ts`
- `NPM_FLAGS` — Netlify build hint in `netlify.toml` (not a secret)

Do not `cat` `.env` / `.env.local`, dump the process environment, or invent
new secret names. If a command needs resolved values, run it through
`varlock run --inject vars -- …` after a schema exists.

TODO for KK: this library/playground currently has no `.env.schema`. Confirm
whether one should be added, or whether Cursor Cloud secrets are the only
extra surface. Do not add the schema in a docs-only change.

### Do not

- Change code, config, CI, or dependencies on a docs-only issue.
- Merge, push to `main`, tag, or `npm publish` without a separate explicit
  instruction. Releases follow [`RELEASING.md`](./RELEASING.md).
- Treat Transmission implementation merge as content approval. Keep
  `transmission-001.json` unapproved until the creator media and transcript
  exist. Do not synthesize a substitute recording or upload a private proof.
- Overwrite someone else's dirty work, `dist/`, or worktree. A dirty status is
  ownership information.
- Reach into unpublished `src/` modules from a consumer; import
  `@walkswithaswagger/winamp` and the documented CSS subpaths.
- Bundle or commit a Nullsoft-copyrighted default skin. Supply a `skinUrl`.
- Invent changelog history. Cite merged PR titles and numbers only.

### Human gates

Stop for credentials, npm login/2FA, trusted-publisher setup, production
deploy config, Transmission content approval, merge, or any irreversible
decision outside the assigned issue. Ordinary implementation inside the
issue scope is agent-owned.

## Delivery

Match the issue's acceptance criteria and stay inside `Out of Scope`. Prefer
the smallest diff. Update `CHANGELOG.md` when you ship user-visible or
agent-facing behavior, using Keep a Changelog headings and real PR numbers.

Land your own work: commit and push the working branch, then open a **draft**
PR that links the source issue. Do not wait to be asked again. Never merge
that PR unless a human says to.

Preserve unrelated dirty work: stage only your paths. Do not `git add -A` in
a shared checkout.

Handoff is factual: files changed, checks run, remaining blockers. If
something is unknown, leave a TODO for KK rather than filling the gap.
