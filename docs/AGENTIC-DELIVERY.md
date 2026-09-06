# Agentic delivery contract

Winamp agent work is issue-shaped, isolated, and reviewable. The source of truth for the machine-readable rules is [`agentic/contract.json`](../agentic/contract.json).

## Delivery flow

1. Start from `origin/main` and create a dedicated worktree under `.worktrees`.
2. Use one issue per worktree and a branch named `codex/issue-<number>-<slug>`.
3. An executable issue has the `agent:ready` label and all six required sections: `Context`, `Acceptance Criteria`, `Tests/Evals`, `Verification`, `Agent Instructions`, and `Out of Scope`.
4. Every acceptance criterion is a Markdown checkbox. Run the issue linter against the saved body before handing the issue to an agent:

   ```sh
   python3 scripts/agentic/issue_lint.py --issue-file path/to/issue.json --labels agent:ready
   ```

   A Markdown body can be linted directly. Labels can be supplied with `--label agent:ready --label blocked`; a saved GitHub-style JSON record may carry its own `body` and `labels` fields.

5. Work only within the declared issue scope. Keep the diff reviewable and run the applicable verification commands.
6. Stop and report when a stop label applies: `blocked`, `needs-human`, or `needs-decision`. These labels must never be combined with `agent:ready`.
7. When implementation and checks are complete, leave a reviewable branch and worktree. GitHub writes, merges, and releases require explicit user authorization; an approved issue/PR delivery request authorizes only its stated writes.

## Verification commands

Use the package scripts and the playground’s own TypeScript configuration:

```sh
pnpm typecheck
pnpm exec tsc --noEmit -p examples/playground/tsconfig.json
pnpm test:run
pnpm build
pnpm check:dist
pnpm check:package
pnpm check:seo
```

Run `pnpm --filter playground build` when the `examples/playground` app is affected. `pnpm check:seo` also builds that app as part of its check. If dependencies are unavailable, report the Node check as blocked; do not install into a user-owned checkout.

The focused offline tool tests require only Python’s standard library:

```sh
python3 -m unittest discover -s scripts/agentic/tests -p 'test_*.py'
```

## Read-only status reporting

The status report never mutates GitHub. Use an offline fixture for deterministic review:

```sh
python3 scripts/agentic/status_report.py --offline scripts/agentic/tests/fixtures/status.json
```

Separate saved issue and pull-request records are also supported:

```sh
python3 scripts/agentic/status_report.py \
  --issues-file path/to/open-issues.json \
  --prs-file path/to/open-prs.json
```

To read current open issues and pull requests through the GitHub CLI, run the same tool with a repository:

```sh
python3 scripts/agentic/status_report.py --repo WalksWithASwagger/winamp
```

The report groups items as `ready`, `blocked`, `needs-human`, `review-ready`, or `unclassified`. `needs-decision` is reported under `needs-human`. A review-ready pull request must carry the existing `review-ready` label; this contract does not create or rename labels.

## Human boundaries

Agents may inspect saved issue data, edit within an approved issue worktree, run local checks, and produce a reviewable diff. The contract’s `boundaries` are default authorization boundaries, not permanent bans on product development. Explicit user approval takes precedence within its stated scope; record that scope in the issue. Stop when completion requires materially broader scope or permissions, credentials, private data, or an unauthorized external action.

The original bootstrap added no dispatch, merge, or release automation. Do not infer authorization for those operations from the presence of delivery tooling. For the transmission surface, also follow [Transmission 001](TRANSMISSION-001.md), including its separate content release gate.
