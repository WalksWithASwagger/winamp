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
7. When the implementation and checks are complete, leave the branch and worktree for human review. A human owns GitHub comments, merges, releases, and any external side effect.

## Verification commands

The repository commands are deliberately copied from `package.json`:

```sh
pnpm typecheck
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

Agents may inspect saved issue data, edit code and docs in their issue worktree, run local checks, and produce a reviewable diff. They must stop for ambiguous product decisions, credentials, private data, external communication, GitHub mutations, merges, releases, branch-protection changes, player behavior changes, or work outside the issue contract.

This bootstrap intentionally adds no GitHub Actions, auto-dispatch, auto-merge, branch protection, Linear writes, labels, player changes, or release changes.
